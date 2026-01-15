import express from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole, UserStatus } from '../models/User.js';
import Organization from '../models/Organization.js';
import MagicToken from '../models/MagicToken.js';
import SalesPerson from '../models/SalesPerson.js';
import { sendMagicLink } from '../services/emailService.js';

const router = express.Router();

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'kult_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d'; // 7 days session

// Helper: Generate JWT token
function generateJWT(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/signup
// User signs up with email, name, company
router.post('/signup', async (req, res) => {
  try {
    const { email, name, company, phone, industry } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already registered. Please use the login flow.' 
      });
    }

    // Check if organization exists (by name)
    let organization;
    if (company) {
      organization = await Organization.getByName(company);
    }

    // If organization doesn't exist, we'll create it after token verification
    // For now, just generate the magic link

    // Create pending user (not saved yet)
    const pendingUserData = {
      email,
      name,
      phone,
      company,
      industry,
      status: UserStatus.PENDING
    };

    // Store pending user data in a temporary way (we'll improve this)
    // For now, create the user as PENDING
    const assignedSalesPerson = industry 
      ? await SalesPerson.autoAssign(industry)
      : (await SalesPerson.getActive())[0];

    const newUser = await User.create({
      email,
      name,
      phone,
      role: UserRole.CLIENT_USER, // Default role
      organizationId: null, // Will be set after verification
      assignedSalesPersonId: assignedSalesPerson?.id || null,
      status: UserStatus.PENDING
    });

    // Generate magic token
    const tokenData = await MagicToken.create(newUser.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send magic link email
    const emailResult = await sendMagicLink(email, name, tokenData.token, 'signup');

    res.json({
      success: true,
      message: 'Magic link sent to your email. Please check your inbox.',
      userId: newUser.id,
      previewUrl: emailResult.previewUrl // For development only
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process signup' 
    });
  }
});

// POST /api/auth/login
// User requests magic link OR logs in with password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Check if user exists
    const user = await User.getByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Email not found. Please sign up first.' 
      });
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ 
        success: false, 
        error: 'Account is not active. Please contact support.' 
      });
    }

    // If password provided, do password login (demo mode: all passwords are 'kult2024')
    if (password) {
      // In demo mode, accept 'kult2024' for all users
      // In production, you would check: bcrypt.compare(password, user.password)
      const validPassword = password === 'kult2024' || password === user.password;
      
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate JWT
      const jwtToken = generateJWT(user);

      // Get organization if user has one
      let organization = null;
      if (user.organizationId) {
        organization = await Organization.getById(user.organizationId);
      }

      return res.json({
        success: true,
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organization: organization
        }
      });
    }

    // If no password provided, send magic link
    // Generate magic token
    const tokenData = await MagicToken.create(user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send magic link email
    const emailResult = await sendMagicLink(email, user.name, tokenData.token, 'login');

    res.json({
      success: true,
      message: 'Magic link sent to your email. Please check your inbox.',
      previewUrl: emailResult.previewUrl // For development only
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process login' 
    });
  }
});

// GET /api/auth/verify?token=xxx
// Verify magic link token and log user in
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
    }

    // Verify token
    const verification = await MagicToken.verify(token);
    if (!verification.valid) {
      return res.status(400).json({ 
        success: false, 
        error: verification.error 
      });
    }

    // Get user
    const user = await User.getById(verification.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // If user was PENDING (new signup), activate and set up organization
    if (user.status === UserStatus.PENDING) {
      // Create organization if needed
      if (user.metadata?.company && !user.organizationId) {
        const salesPerson = await SalesPerson.getById(user.assignedSalesPersonId);
        
        const organization = await Organization.create({
          name: user.metadata.company,
          industry: user.metadata.industry || '',
          adminUserId: user.id,
          assignedSalesPersonId: user.assignedSalesPersonId,
          teamMembers: [user.id]
        });

        // Assign organization to sales person
        if (salesPerson) {
          await SalesPerson.assignOrganization(salesPerson.id, organization.id);
        }

        // Update user with organization and promote to admin
        await User.update(user.id, {
          organizationId: organization.id,
          role: UserRole.CLIENT_ADMIN, // First user becomes admin
          status: UserStatus.ACTIVE
        });

        // Refresh user data
        const updatedUser = await User.getById(user.id);
        
        // Update last login
        await User.updateLastLogin(user.id);

        // Generate JWT
        const jwtToken = generateJWT(updatedUser);

        return res.json({
          success: true,
          message: 'Signup completed successfully',
          token: jwtToken,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            organizationId: updatedUser.organizationId,
            organization: organization
          }
        });
      }
    }

    // Regular login for existing active users
    await User.updateLastLogin(user.id);

    // Generate JWT
    const jwtToken = generateJWT(user);

    // Get organization if user has one
    let organization = null;
    if (user.organizationId) {
      organization = await Organization.getById(user.organizationId);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: organization
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify token' 
    });
  }
});

// POST /api/auth/forgot-password
// Send password reset magic link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Check if user exists
    const user = await User.getByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }

    // Generate magic token for password reset
    const tokenData = await MagicToken.create(user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      purpose: 'password-reset'
    });

    // Send password reset magic link
    const emailResult = await sendMagicLink(email, user.name, tokenData.token, 'login');

    res.json({
      success: true,
      message: 'If that email exists, a password reset link has been sent.',
      previewUrl: emailResult.previewUrl // For development only
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process request' 
    });
  }
});

// POST /api/auth/logout
// Logout user (invalidate tokens)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization header' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    // Invalidate all magic tokens for this user
    await MagicToken.invalidateUserTokens(decoded.userId);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.json({
      success: true,
      message: 'Logged out'
    });
  }
});

// GET /api/auth/me
// Get current user info (protected route)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization header' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.getById(decoded.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Get organization
    let organization = null;
    if (user.organizationId) {
      organization = await Organization.getById(user.organizationId);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        organizationId: user.organizationId,
        organization: organization,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user info' 
    });
  }
});

export default router;
