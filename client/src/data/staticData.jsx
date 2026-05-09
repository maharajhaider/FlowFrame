import React from 'react';

export const mockSprints = [
  {
    id: 1,
    name: 'Sprint Alpha',
    startDate: '2025-06-01',
    endDate: '2025-06-14',
  },
  {
    id: 2,
    name: 'Sprint Beta',
    startDate: '2025-05-15',
    endDate: '2025-05-30',
  },
  {
    id: 3,
    name: 'Sprint Gamma',
    startDate: '2025-06-15',
    endDate: '2025-06-30',
  },
];

export const mockFeatures = [
  {
    id: 'T1',
    sprintId: 1,
    title: 'Design Login Page',
    description: 'Responsive login with OAuth',
    estimatedHours: 6,
    priority: 'high',
    assignee: 'Alex',
    isApproved: false,
    tasks: [
      {
        id: 'ST1',
        title: 'OAuth UI',
        description: 'Google login button',
        estimatedHours: 2,
        assignee: 'Dana',
        isApproved: false,
        priority: 'high',
      },
      {
        id: 'ST2',
        title: 'Form Validation',
        description: 'Field checks',
        estimatedHours: 1,
        assignee: null,
        isApproved: false,
        priority: 'low',
      },
    ],
  },
  {
    id: 'T2',
    sprintId: 1,
    title: 'Set up Firebase Auth',
    description: 'Integrate Firebase',
    estimatedHours: 4,
    priority: 'medium',
    assignee: 'Jamie',
    isApproved: false,
    tasks: [
      {
        id: 'ST3',
        title: 'Firebase Config',
        description: 'Initialize app and set up env variables',
        estimatedHours: 2,
        assignee: 'Jamie',
        isApproved: false,
        priority: 'medium',
      },
    ],
  },
  {
    id: 'T3',
    sprintId: 2,
    title: 'Initial Setup',
    description: 'Vite + React + Tailwind',
    estimatedHours: 3,
    priority: 'low',
    assignee: 'Jamie',
    isApproved: false,
    tasks: [
      {
        id: 'ST4',
        title: 'Scaffold Project',
        description: 'Install Vite, Tailwind, and set up folder structure',
        estimatedHours: 3,
        assignee: 'Jamie',
        isApproved: false,
        priority: 'low',
      },
    ],
  },
  {
    id: 'T4',
    sprintId: 2,
    title: 'Setup CI/CD',
    description: 'Configure GitHub Actions for deployment',
    estimatedHours: 5,
    priority: 'medium',
    assignee: 'Morgan',
    isApproved: false,
    tasks: [
      {
        id: 'ST5',
        title: 'Build Job',
        description: 'Run linter, build, and tests on PR',
        estimatedHours: 2,
        assignee: 'Morgan',
        priority: 'medium',
        isApproved: false,
      },
      {
        id: 'ST6',
        title: 'Deploy Job',
        description: 'Deploy to staging',
        estimatedHours: 3,
        assignee: 'Alex',
        priority: 'medium',
        isApproved: false,
      },
    ],
  },
  {
    id: 'T5',
    sprintId: 3,
    title: 'User Profile Page',
    description: 'Create UI and API for profile',
    estimatedHours: 7,
    priority: 'high',
    assignee: 'Dana',
    isApproved: false,
    tasks: [
      {
        id: 'ST7',
        title: 'Profile UI',
        description: 'Avatar, username, and email form',
        estimatedHours: 4,
        assignee: 'Dana',
        isApproved: false,
        priority: 'high',
      },
      {
        id: 'ST8',
        title: 'Profile API',
        description: 'GET/PUT endpoints for user profile',
        estimatedHours: 3,
        assignee: null,
        isApproved: false,
        priority: 'medium',
      },
    ],
  },
];

export const mockProjectData = {
  sprints: {
    1: {
      id: '1',
      title: 'Sprint 1',
      description: 'Authentication and onboarding',
      featureIds: ['F1', 'F2'],
      startDate: '2025-05-15',
      endDate: '2025-05-30',
    },
    2: {
      id: '2',
      title: 'Sprint 2',
      description: 'User dashboard and analytics',
      featureIds: ['F3', 'F4'],
      startDate: '2025-05-30',
      endDate: '2025-06-15',
    },
  },
  features: {
    F1: {
      id: 'F1',
      title: 'Login Page',
      description: 'Responsive login UI with OAuth',
      priority: 'high',
      taskIds: ['T1', 'T2'],
    },
    F2: {
      id: 'F2',
      title: 'Sign-Up Flow',
      description: 'Sign-up form and validation',
      priority: 'medium',
      taskIds: ['T3', 'T4'],
    },
    F3: {
      id: 'F3',
      title: 'Dashboard UI',
      description: 'User dashboard components',
      priority: 'medium',
      taskIds: ['T5'],
    },
    F4: {
      id: 'F4',
      title: 'Usage Analytics',
      description: 'Track and visualize user activity',
      priority: 'high',
      taskIds: ['T6', 'T7'],
    },
  },
  tasks: {
    T1: {
      id: 'T1',
      title: 'Design UI',
      description: 'Responsive layout',
      estimatedHours: 3,
      assignee: 'Alice',
      priority: 'medium',
      featureId: 'F1',
      sprintId: '1',
    },
    T2: {
      id: 'T2',
      title: 'Google OAuth',
      description: 'Google sign-in',
      estimatedHours: 2,
      assignee: 'Bob',
      priority: 'high',
      featureId: 'F1',
      sprintId: '1',
    },
    T3: {
      id: 'T3',
      title: 'Form Validation',
      description: 'Yup client-side validation',
      estimatedHours: 2,
      assignee: null,
      priority: 'low',
      featureId: 'F2',
      sprintId: '1',
    },
    T4: {
      id: 'T4',
      title: 'Connect Backend',
      description: 'Create user API',
      estimatedHours: 3,
      assignee: 'Charlie',
      priority: 'high',
      featureId: 'F2',
      sprintId: '1',
    },
    T5: {
      id: 'T5',
      title: 'Card Layout',
      description: 'Summary grid layout',
      estimatedHours: 2,
      assignee: 'Dana',
      priority: 'medium',
      featureId: 'F3',
      sprintId: '2',
    },
    T6: {
      id: 'T6',
      title: 'Tracking Events',
      description: 'Analytics backend',
      estimatedHours: 4,
      assignee: 'Erik',
      priority: 'high',
      featureId: 'F4',
      sprintId: '2',
    },
    T7: {
      id: 'T7',
      title: 'Charts',
      description: 'Usage charts with Chart.js',
      estimatedHours: 3,
      assignee: null,
      priority: 'medium',
      featureId: 'F4',
      sprintId: '2',
    },
  },
};

export const mockDevelopers = [
  {
    id: '1',
    name: 'Alex',
    email: 'alex@example.com',
    skills: ['React', 'Firebase'],
    experience: 'senior',
    currentWorkload: 30,
    maxCapacity: 40,
    completedTasks: 22,
    activeFeaturesCount: 2,
    joinedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    name: 'Dana',
    email: 'dana@example.com',
    skills: ['UI', 'OAuth'],
    experience: 'mid',
    currentWorkload: 26,
    maxCapacity: 40,
    completedTasks: 18,
    activeFeaturesCount: 3,
    joinedAt: new Date('2023-02-01'),
  },
  {
    id: '3',
    name: 'Jamie',
    email: 'jamie@example.com',
    skills: ['Tailwind', 'TypeScript', 'Testing'],
    experience: 'junior',
    currentWorkload: 18,
    maxCapacity: 35,
    completedTasks: 10,
    activeFeaturesCount: 1,
    joinedAt: new Date('2024-01-15'),
  },
  {
    id: '4',
    name: 'Morgan',
    email: 'morgan@example.com',
    skills: ['CI/CD', 'Node.js', 'Docker'],
    experience: 'senior',
    currentWorkload: 32,
    maxCapacity: 40,
    completedTasks: 25,
    activeFeaturesCount: 2,
    joinedAt: new Date('2022-08-01'),
  },
];


export const getPriorityColor = priority => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStatusIcon = status => {
  switch (status) {
    case 'todo':
      return <span className="text-gray-500">🕒</span>;
    case 'in_progress':
      return <span className="text-blue-500">🔧</span>;
    case 'done':
      return <span className="text-green-500">✅</span>;
    default:
      return <span className="text-gray-400">•</span>;
  }
};

export const getTicketNumber = id => `#${id}`;
