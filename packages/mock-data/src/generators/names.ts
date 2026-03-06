import { randomElement } from './utils';

const COMPANY_NAMES = [
  'Acme Corp', 'TechCorp', 'Global Dynamics', 'Initech', 'Umbrella Corporation',
  'Massive Dynamic', 'Cyberdyne Systems', 'Tyrell Corporation', 'Soylent Corp',
  'Wonka Industries', 'Stark Industries', 'Wayne Enterprises', 'Globex Corporation',
  'Hooli', 'Pied Piper', 'Raviga Capital', 'Aviato', 'Bachmanity',
  'Intertrode', 'Initrode', 'Compuglobalhypermeganet', 'Prestige Worldwide',
  'Dunder Mifflin', 'Vehement Capital', 'Sterling Cooper', 'Pearson Hardman',
  'Atlantic Northern', 'Pacific Data Systems', 'Midwest Manufacturing',
  'Summit Solutions', 'Apex Analytics', 'Vertex Ventures', 'Nexus Networks',
  'Pinnacle Products', 'Horizon Healthcare', 'Zenith Technologies',
  'Aurora Systems', 'Beacon Industries', 'Catalyst Corp', 'Delta Dynamics',
  'Eclipse Enterprises', 'Fusion Financial', 'Genesis Group', 'Hyperion Holdings',
];

const PRODUCTS = [
  'Enterprise License', 'Professional Plan', 'Premium Subscription', 'Cloud Platform',
  'Analytics Suite', 'Security Solution', 'Marketing Platform', 'CRM System',
  'Data Warehouse', 'API Integration', 'Mobile App', 'Desktop Software',
  'SaaS Platform', 'Consulting Services', 'Implementation Package', 'Training Program',
  'Support Contract', 'Managed Services', 'Development Tools', 'Infrastructure',
];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

// Organized by seniority level
const TITLES_BY_SENIORITY = {
  c_level: [
    'CEO', 'CTO', 'CFO', 'COO', 'CRO', 'CMO', 'CIO', 'CISO',
    'Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer',
  ],
  vp: [
    'VP of Sales', 'VP Engineering', 'SVP Marketing', 'EVP Operations',
    'VP of Product', 'VP Customer Success', 'VP of Finance', 'VP Human Resources',
    'Vice President of Sales', 'Senior Vice President of Operations',
  ],
  director: [
    'Director of IT', 'Senior Director of Procurement', 'Director of Engineering',
    'Director of Marketing', 'Director of Operations', 'Director of Sales',
    'IT Director', 'Sales Director', 'Marketing Director',
  ],
  manager: [
    'Engineering Manager', 'Head of DevOps', 'Senior Product Manager', 'IT Manager',
    'Sales Manager', 'Marketing Manager', 'Operations Manager', 'Project Manager',
    'Team Lead', 'Head of Customer Success', 'Product Manager',
  ],
  individual: [
    'Software Engineer', 'Account Executive', 'Marketing Specialist', 'Analyst',
    'Senior Software Engineer', 'Sales Representative', 'Business Analyst',
    'Data Analyst', 'Product Specialist', 'Technical Lead', 'Consultant',
    'Developer', 'Designer', 'Coordinator', 'Associate',
  ],
};

export function generateCompanyName(): string {
  return randomElement(COMPANY_NAMES);
}

export function generateDealName(companyName?: string): string {
  const company = companyName || generateCompanyName();
  const product = randomElement(PRODUCTS);
  return `${company} - ${product}`;
}

export function generateFirstName(): string {
  return randomElement(FIRST_NAMES);
}

export function generateLastName(): string {
  return randomElement(LAST_NAMES);
}

export function generateFullName(): string {
  return `${generateFirstName()} ${generateLastName()}`;
}

export function generateEmail(firstName: string, lastName: string, companyName: string): string {
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`;
}

export function generateTitle(seniorityPreference?: 'c_level' | 'vp' | 'director' | 'manager' | 'individual'): string {
  if (seniorityPreference) {
    return randomElement(TITLES_BY_SENIORITY[seniorityPreference]);
  }

  // Random distribution favoring individual contributors
  const rand = Math.random();
  if (rand < 0.05) return randomElement(TITLES_BY_SENIORITY.c_level);
  if (rand < 0.15) return randomElement(TITLES_BY_SENIORITY.vp);
  if (rand < 0.30) return randomElement(TITLES_BY_SENIORITY.director);
  if (rand < 0.50) return randomElement(TITLES_BY_SENIORITY.manager);
  return randomElement(TITLES_BY_SENIORITY.individual);
}

export function generateOwnerName(): string {
  return `${generateFirstName()} ${generateLastName()}`;
}
