const mongoose = require('mongoose');
const path = require('path');
const User = require('../models/User');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')  
});

const createDummyProjectManager = async () => {
  try {
    const existingManager = await User.findOne({ email: 'manager@flowframe.com' });
    
    if (!existingManager) {
      const dummyManager = new User({
        email: 'manager@flowframe.com',
        password: 'Manager123',
        name: 'Project Manager',
        roles: ['project_manager'],
        isEmailVerified: true,
      });
      
      await dummyManager.save();
      console.log('✅ Dummy project manager account created:');
      console.log('   Email: manager@flowframe.com');
      console.log('   Password: Manager123');
      console.log('   Role: project_manager');
    } else {
      console.log('✅ Dummy project manager account already exists');
    }
  } catch (error) {
    console.error('Error creating dummy project manager:', error);
  }
};

const createDummyTeamMembers = async () => {
  console.log('🔄 Starting to create dummy team members...');
  const teamMembers = [
    // Designers (3)
    {
      email: 'monicacarr@stewart.com',
      password: 'Designer123',
      name: 'Jessica Daniels',
      roles: ['designer'],
      skills: ['UI/UX Design', 'Adobe XD', 'Sketch', 'Figma', 'Prototyping'],
      past_issues_solved: [
        'Redesigned user dashboard interface for better accessibility',
        'Created mobile-responsive login flow',
        'Designed icon system for enterprise application',
        'Improved checkout process UX reducing cart abandonment',
        'Built design system components for consistent branding'
      ],
      current_workload: 0,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'fosterthomas@mcmillan.com',
      password: 'Designer123',
      name: 'Barbara Jackson',
      roles: ['designer'],
      skills: ['UI/UX Design', 'Adobe XD', 'Sketch', 'Accessibility', 'User Research'],
      past_issues_solved: [
        'Designed accessible color palette meeting WCAG guidelines',
        'Created user onboarding flow increasing retention by 35%',
        'Built interactive prototype for investor presentation'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'wallaceanthony@hotmail.com',
      password: 'Designer123',
      name: 'Jacob Hunter',
      roles: ['designer'],
      skills: ['UI/UX Design', 'Adobe XD', 'Sketch', 'Mobile Design', 'Branding'],
      past_issues_solved: [
        'Designed mobile app interface with gesture-based navigation',
        'Created brand identity and style guide for startup',
        'Built interactive wireframes for client approval process'
      ],
      current_workload: 4,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },

    // Frontend Developers (2)
    {
      email: 'hartmanwilliam@bishop.com',
      password: 'Frontend123',
      name: 'Kristen Hernandez',
      roles: ['developer'],
      skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Redux'],
      past_issues_solved: [
        'Built responsive product catalog with infinite scroll',
        'Implemented real-time chat feature using WebSockets',
        'Created data visualization dashboard with D3.js',
        'Optimized React app performance reducing load time by 40%'
      ],
      current_workload: 2,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'pjones@henry.com',
      password: 'Frontend123',
      name: 'Julia Sanders',
      roles: ['developer'],
      skills: ['React', 'JavaScript', 'Figma', 'CSS', 'HTML'],
      past_issues_solved: [],
      current_workload: 6,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },

    // Backend Developers (14)
    {
      email: 'davidfischer@finley.net',
      password: 'Backend123',
      name: 'Michael Peters',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs', 'JavaScript'],
      past_issues_solved: [
        'Fixed database connection pooling issues causing timeouts',
        'Implemented RESTful API for user authentication system'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'deanlorraine@yahoo.com',
      password: 'Backend123',
      name: 'Amanda Davis',
      roles: ['developer'],
      skills: ['Python', 'Django', 'REST APIs', 'PostgreSQL', 'Flask'],
      past_issues_solved: [
        'Developed payment processing integration with Stripe API'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'daviserik@gmail.com',
      password: 'Backend123',
      name: 'Scott Long',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'GraphQL', 'Docker'],
      past_issues_solved: [],
      current_workload: 2,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'zcastaneda@hinton.com',
      password: 'Backend123',
      name: 'Michael Miller',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'OAuth2', 'Microservices'],
      past_issues_solved: [
        'Implemented OAuth2 authentication flow',
        'Built microservices architecture for order processing system'
      ],
      current_workload: 3,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'eriksuarez@shea.info',
      password: 'Backend123',
      name: 'Michael Scott',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'Apache Kafka', 'Redis', 'Microservices'],
      past_issues_solved: [
        'Architected scalable notification system handling 1M+ daily messages',
        'Implemented database sharding strategy for user data',
        'Built real-time analytics pipeline using Apache Kafka',
        'Optimized API response times improving performance by 70%'
      ],
      current_workload: 6,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'angelica94@yahoo.com',
      password: 'Backend123',
      name: 'Kathryn Dyer',
      roles: ['developer'],
      skills: ['Java', 'Spring Boot', 'MySQL', 'Enterprise Systems', 'Email Services'],
      past_issues_solved: [
        'Built enterprise reporting dashboard with advanced filtering',
        'Implemented user role management system',
        'Created email notification service using Spring Boot'
      ],
      current_workload: 6,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'miguel91@drake-franklin.com',
      password: 'Backend123',
      name: 'Derek Kelly',
      roles: ['developer'],
      skills: ['Python', 'Django', 'REST APIs', 'Machine Learning', 'Elasticsearch'],
      past_issues_solved: [
        'Developed machine learning model for product recommendations',
        'Built RESTful API for mobile app backend',
        'Implemented search functionality with Elasticsearch',
        'Created automated data backup and recovery system'
      ],
      current_workload: 3,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'anthony71@weaver-sandoval.org',
      password: 'Backend123',
      name: 'Robert Wells',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'WebSockets'],
      past_issues_solved: [
        'Built scalable chat application supporting 10K concurrent users',
        'Implemented Redis caching layer reducing database load by 80%'
      ],
      current_workload: 2,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'nicholas46@hotmail.com',
      password: 'Backend123',
      name: 'Jennifer King',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'Jenkins', 'ELK Stack', 'DevOps'],
      past_issues_solved: [
        'Developed automated deployment pipeline using Jenkins',
        'Built monitoring dashboard for system health metrics',
        'Implemented log aggregation system using ELK stack',
        'Created database migration scripts for production deployment'
      ],
      current_workload: 0,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'dennis79@lewis-johnson.com',
      password: 'Backend123',
      name: 'Emily Jennings',
      roles: ['developer'],
      skills: ['Python', 'Django', 'REST APIs', 'Social Authentication', 'CMS'],
      past_issues_solved: [
        'Built content management system using Django framework',
        'Implemented user authentication with social login integration',
        'Created REST API for mobile app data synchronization'
      ],
      current_workload: 3,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'gwells@yahoo.com',
      password: 'Backend123',
      name: 'Lori Thompson',
      roles: ['developer'],
      skills: ['Java', 'Spring Boot', 'MySQL', 'Inventory Management', 'Analytics'],
      past_issues_solved: [
        'Developed inventory management system for retail chain',
        'Built employee scheduling application using Spring Boot',
        'Implemented data export functionality for business analytics'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'schneiderdaniel@gmail.com',
      password: 'Backend123',
      name: 'Linda Ewing',
      roles: ['developer'],
      skills: ['Java', 'Spring Boot', 'MySQL', 'CRM', 'Email Marketing'],
      past_issues_solved: [
        'Built customer relationship management system',
        'Implemented automated email marketing campaigns',
        'Created financial reporting dashboard with real-time data'
      ],
      current_workload: 5,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'ihenry@gmail.com',
      password: 'Backend123',
      name: 'Joshua George',
      roles: ['developer'],
      skills: ['Node.js', 'Express', 'MongoDB', 'JavaScript', 'REST APIs'],
      past_issues_solved: [],
      current_workload: 0,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'aaron83@gmail.com',
      password: 'Backend123',
      name: 'Jason Daniels',
      roles: ['developer'],
      skills: ['Python', 'Django', 'REST APIs', 'Machine Learning', 'Data Analysis'],
      past_issues_solved: [
        'Built sentiment analysis tool for customer feedback processing',
        'Implemented machine learning pipeline for fraud detection',
        'Created automated testing framework for API endpoints',
        'Developed data visualization platform for business intelligence'
      ],
      current_workload: 0,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },

    // QA Engineers (5)
    {
      email: 'diazpaul@yahoo.com',
      password: 'QA1234',
      name: 'Sonya Fitzpatrick',
      roles: ['tester'],
      skills: ['Testing', 'Selenium', 'JUnit', 'Automation', 'Quality Assurance'],
      past_issues_solved: [
        'Automated end-to-end testing for user registration workflow'
      ],
      current_workload: 2,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'uwilson@gmail.com',
      password: 'QA1234',
      name: 'Scott Peterson',
      roles: ['tester'],
      skills: ['Testing', 'Selenium', 'JUnit', 'TestNG', 'Cypress'],
      past_issues_solved: [],
      current_workload: 0,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'usmith@gmail.com',
      password: 'QA1234',
      name: 'Ann Stein',
      roles: ['tester'],
      skills: ['Testing', 'Selenium', 'JUnit', 'Payment Testing', 'Quality Assurance'],
      past_issues_solved: [
        'Developed comprehensive test suite for payment processing system'
      ],
      current_workload: 4,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'ycantrell@hotmail.com',
      password: 'QA1234',
      name: 'Danielle Hunter',
      roles: ['tester'],
      skills: ['Testing', 'Selenium', 'JUnit', 'E-commerce Testing', 'Automation'],
      past_issues_solved: [
        'Automated browser testing for e-commerce checkout flow'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'irussell@ibarra.com',
      password: 'QA1234',
      name: 'Jennifer Wolf',
      roles: ['tester'],
      skills: ['Testing', 'Selenium', 'JUnit', 'Automation', 'Manual Testing'],
      past_issues_solved: [],
      current_workload: 4,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },

    // Project Managers (8)
    {
      email: 'xruiz@hotmail.com',
      password: 'PM1234',
      name: 'Zachary Green',
      roles: ['project_manager'],
      skills: ['Project Management', 'Agile', 'Scrum', 'Jira', 'Confluence'],
      past_issues_solved: [
        'Coordinated sprint planning for 3-team integration project'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'junior',
      isEmailVerified: true,
    },
    {
      email: 'owashington@moon.com',
      password: 'PM1234',
      name: 'Kelly Robinson',
      roles: ['project_manager'],
      skills: ['Project Management', 'Agile', 'Scrum', 'Leadership', 'Strategy'],
      past_issues_solved: [
        'Managed cross-functional team delivery of mobile app redesign'
      ],
      current_workload: 6,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'brianna34@smith.net',
      password: 'PM1234',
      name: 'Shane Silva',
      roles: ['project_manager'],
      skills: ['Project Management', 'Agile', 'DevOps', 'CI/CD', 'Leadership'],
      past_issues_solved: [
        'Led migration from waterfall to agile methodology',
        'Established CI/CD pipeline reducing deployment time by 60%'
      ],
      current_workload: 1,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
    {
      email: 'nortoncharles@taylor.com',
      password: 'PM1234',
      name: 'Tammy Olsen',
      roles: ['project_manager'],
      skills: ['Project Management', 'Design Systems', 'User Research', 'Accessibility', 'Leadership'],
      past_issues_solved: [
        'Managed design system implementation across 5 product teams',
        'Led user research study resulting in 25% engagement increase',
        'Coordinated rebranding project for Fortune 500 client',
        'Designed accessibility-first interface for government portal'
      ],
      current_workload: 2,
      max_capacity: 8,
      availability: true,
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'wrightmeghan@anderson.com',
      password: 'PM1234',
      name: 'Amy Strickland',
      roles: ['project_manager'],
      skills: ['Project Management', 'Agile', 'Scrum', 'Risk Management', 'Banking Systems'],
      past_issues_solved: [
        'Coordinated technical requirements gathering for banking system',
        'Managed stakeholder communication during platform migration',
        'Led risk assessment and mitigation planning for cloud transition'
      ],
      current_workload: 6,
      max_capacity: 8,
      availability: false, // This user is marked as unavailable
      experience_level: 'senior',
      isEmailVerified: true,
    },
    {
      email: 'ewaters@sloan.com',
      password: 'PM1234',
      name: 'Kristin Kelly',
      roles: ['project_manager'],
      skills: ['Project Management', 'Healthcare Systems', 'API Integration', 'Leadership'],
      past_issues_solved: [
        'Led development of hospital patient management system',
        'Coordinated API integration with third-party healthcare providers'
      ],
      current_workload: 3,
      max_capacity: 8,
      availability: true,
      experience_level: 'mid',
      isEmailVerified: true,
    },
  ];

  try {
    console.log(`🔄 Processing ${teamMembers.length} team members...`);
    let createdCount = 0;
    let existingCount = 0;

    for (const member of teamMembers) {
      const existingUser = await User.findOne({ email: member.email });
      
      if (!existingUser) {
        const newUser = new User(member);
        await newUser.save();
        createdCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`\n📊 Team Creation Summary:`);
    console.log(`   Created: ${createdCount} new team members`);
    console.log(`   Existing: ${existingCount} team members already in database`);
    console.log(`   Total: ${createdCount + existingCount} team members available`);

  } catch (error) {
    console.error('Error creating dummy team members:', error);
  }
};

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI environment variable is missing');
    console.error('Please set MONGODB_URI in your .env file');
    process.exit(1);
  }
  
  const trimmedUri = uri.trim();
  console.log('Attempting to connect with:', trimmedUri);

  try {
    await mongoose.connect(trimmedUri);
    console.log('MongoDB connected');
    
    await createDummyProjectManager();
    await createDummyTeamMembers();
    
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};
