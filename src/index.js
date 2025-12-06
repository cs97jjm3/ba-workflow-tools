#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Read user configuration from environment variables
const FISCAL_YEAR_START = parseInt(process.env.FISCAL_YEAR_START_MONTH) || 4;
const DEFAULT_SPRINT_LENGTH = parseInt(process.env.DEFAULT_SPRINT_LENGTH) || 2;
const DEFAULT_POINT_RATIO = parseFloat(process.env.POINT_TO_HOUR_RATIO) || 4;
const DEFAULT_OVERHEAD = parseFloat(process.env.OVERHEAD_FACTOR) || 0.2;

// UK Bank Holidays for 2024-2026 (can be extended)
const UK_BANK_HOLIDAYS = [
  // 2024
  '2024-01-01', '2024-03-29', '2024-04-01', '2024-05-06', '2024-05-27', 
  '2024-08-26', '2024-12-25', '2024-12-26',
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31', '2026-12-25', '2026-12-28'
];

// Helper function to check if date is a weekend
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Helper function to check if date is a bank holiday
function isBankHoliday(date) {
  const dateStr = date.toISOString().split('T')[0];
  return UK_BANK_HOLIDAYS.includes(dateStr);
}

// Helper function to check if date is a working day
function isWorkingDay(date) {
  return !isWeekend(date) && !isBankHoliday(date);
}

// Calculate working days between two dates
function calculateWorkingDaysBetween(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    if (isWorkingDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// Add working days to a date
function addWorkingDays(startDate, daysToAdd) {
  let current = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < daysToAdd) {
    current.setDate(current.getDate() + 1);
    if (isWorkingDay(current)) {
      daysAdded++;
    }
  }
  
  return current;
}

// Subtract working days from a date
function subtractWorkingDays(startDate, daysToSubtract) {
  let current = new Date(startDate);
  let daysSubtracted = 0;
  
  while (daysSubtracted < daysToSubtract) {
    current.setDate(current.getDate() - 1);
    if (isWorkingDay(current)) {
      daysSubtracted++;
    }
  }
  
  return current;
}

// Format user story
function formatUserStory(role, feature, businessValue, placement, visualType, behavior, extraInfo, acceptanceCriteria) {
  let story = `**Requirement**\n`;
  story += `As a ${role},\n`;
  story += `I want ${feature},\n`;
  story += `So that ${businessValue}.\n\n`;
  
  story += `**Placement on the Page**\n`;
  story += `This feature should be located in ${placement}.\n`;
  story += `It should be visually ${visualType}.\n\n`;
  
  story += `**Expected Behavior**\n`;
  story += `${behavior}\n\n`;
  
  if (extraInfo && extraInfo.trim()) {
    story += `**Extra Information**\n`;
    story += `${extraInfo}\n\n`;
  }
  
  story += `**Acceptance Criteria**\n`;
  if (Array.isArray(acceptanceCriteria)) {
    acceptanceCriteria.forEach(criterion => {
      story += `Given that ${criterion.precondition},\n`;
      story += `When ${criterion.action},\n`;
      story += `Then ${criterion.outcome}.\n\n`;
    });
  } else {
    story += `${acceptanceCriteria}\n`;
  }
  
  return story;
}

// Convert time between timezones
function convertTimezone(time, fromTz, toTz) {
  const timezones = {
    'UTC': 0,
    'GMT': 0,
    'BST': 1,
    'EST': -5,
    'EDT': -4,
    'CST': -6,
    'CDT': -5,
    'MST': -7,
    'MDT': -6,
    'PST': -8,
    'PDT': -7,
    'AEST': 10,
    'AEDT': 11,
    'IST': 5.5,
    'CET': 1,
    'CEST': 2,
    'MYT': 8
  };
  
  // Parse time (assume HH:MM format)
  const [hours, minutes] = time.split(':').map(Number);
  
  // Convert to UTC first
  let utcHours = hours - (timezones[fromTz] || 0);
  
  // Convert to target timezone
  let targetHours = utcHours + (timezones[toTz] || 0);
  
  // Handle day overflow
  let dayOffset = 0;
  if (targetHours >= 24) {
    dayOffset = Math.floor(targetHours / 24);
    targetHours = targetHours % 24;
  } else if (targetHours < 0) {
    dayOffset = Math.ceil(targetHours / 24) - 1;
    targetHours = ((targetHours % 24) + 24) % 24;
  }
  
  const targetMinutes = minutes;
  
  return {
    time: `${String(Math.floor(targetHours)).padStart(2, '0')}:${String(targetMinutes).padStart(2, '0')}`,
    dayOffset: dayOffset
  };
}

// Find best meeting time across timezones
function findMeetingTime(participants, duration, preferredHours) {
  // participants: [{name, timezone, availableHours: [9, 17]}]
  // Returns suggested times that work for everyone
  
  const suggestions = [];
  
  // Check each hour in the working day
  for (let hour = 8; hour <= 18; hour++) {
    const time = `${String(hour).padStart(2, '0')}:00`;
    let worksForAll = true;
    const timeDetails = [];
    
    participants.forEach(participant => {
      const converted = convertTimezone(time, 'GMT', participant.timezone);
      const convertedHour = parseInt(converted.time.split(':')[0]);
      
      const isWithinHours = convertedHour >= participant.availableHours[0] && 
                           convertedHour <= participant.availableHours[1];
      
      if (!isWithinHours || converted.dayOffset !== 0) {
        worksForAll = false;
      }
      
      timeDetails.push({
        name: participant.name,
        time: converted.time,
        timezone: participant.timezone,
        suitable: isWithinHours && converted.dayOffset === 0
      });
    });
    
    if (worksForAll) {
      suggestions.push({
        baseTime: time,
        baseTimezone: 'GMT',
        participants: timeDetails
      });
    }
  }
  
  return suggestions;
}

// Calculate sprint dates
function calculateSprintDates(sprintStart, sprintLength, numberOfSprints) {
  const sprints = [];
  let currentStart = new Date(sprintStart);
  
  for (let i = 1; i <= numberOfSprints; i++) {
    const sprintEnd = new Date(currentStart);
    sprintEnd.setDate(sprintEnd.getDate() + (sprintLength * 7) - 1);
    
    const workingDays = calculateWorkingDaysBetween(currentStart, sprintEnd);
    
    sprints.push({
      sprintNumber: i,
      startDate: currentStart.toISOString().split('T')[0],
      endDate: sprintEnd.toISOString().split('T')[0],
      workingDays: workingDays
    });
    
    // Move to next sprint
    currentStart = new Date(sprintEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  return sprints;
}

// Text utilities
function performTextOperation(operation, text, options = {}) {
  switch (operation) {
    case 'word_count':
      return text.trim().split(/\s+/).length;
      
    case 'char_count':
      return text.length;
      
    case 'remove_duplicates':
      const lines = text.split('\n');
      return [...new Set(lines)].join('\n');
      
    case 'sort_lines':
      const sortedLines = text.split('\n').sort();
      return options.reverse ? sortedLines.reverse().join('\n') : sortedLines.join('\n');
      
    case 'extract_emails':
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      return (text.match(emailRegex) || []).join('\n');
      
    case 'extract_urls':
      const urlRegex = /https?:\/\/[^\s]+/g;
      return (text.match(urlRegex) || []).join('\n');
      
    case 'to_uppercase':
      return text.toUpperCase();
      
    case 'to_lowercase':
      return text.toLowerCase();
      
    case 'to_title_case':
      return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      
    case 'trim_whitespace':
      return text.split('\n').map(line => line.trim()).join('\n');
      
    case 'add_line_numbers':
      return text.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
      
    default:
      return 'Unknown operation';
  }
}

// Calculate release date based on story points and velocity
function calculateReleaseDate(startDate, storyPointsRemaining, teamVelocity, sprintLength) {
  const sprintsNeeded = Math.ceil(storyPointsRemaining / teamVelocity);
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < sprintsNeeded; i++) {
    // Add sprint length in weeks
    currentDate.setDate(currentDate.getDate() + (sprintLength * 7));
  }
  
  const workingDaysToComplete = calculateWorkingDaysBetween(new Date(startDate), currentDate);
  
  return {
    estimatedReleaseDate: currentDate.toISOString().split('T')[0],
    sprintsNeeded: sprintsNeeded,
    weeksNeeded: sprintsNeeded * sprintLength,
    workingDaysNeeded: workingDaysToComplete
  };
}

// Calculate team velocity and capacity
function calculateVelocity(completedPoints, capacityAdjustments = {}) {
  const totalPoints = completedPoints.reduce((sum, points) => sum + points, 0);
  const averageVelocity = totalPoints / completedPoints.length;
  
  // Apply capacity adjustments (holidays, team changes, etc.)
  const {
    daysOff = 0,
    teamSize = 5,
    sprintLength = 2,
    adjustmentFactor = 1.0
  } = capacityAdjustments;
  
  // Rough estimate: each day off reduces capacity proportionally
  const workingDaysInSprint = sprintLength * 5;
  const holidayImpact = daysOff / workingDaysInSprint;
  const adjustedVelocity = averageVelocity * adjustmentFactor * (1 - holidayImpact);
  
  return {
    historicalVelocity: completedPoints,
    averageVelocity: Math.round(averageVelocity * 10) / 10,
    adjustedVelocity: Math.round(adjustedVelocity * 10) / 10,
    min: Math.min(...completedPoints),
    max: Math.max(...completedPoints),
    range: Math.max(...completedPoints) - Math.min(...completedPoints)
  };
}

// Calculate fiscal quarter (UK fiscal year starts April 1)
function calculateFiscalInfo(date, fiscalYearStart = FISCAL_YEAR_START) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // JavaScript months are 0-indexed
  const year = d.getFullYear();
  
  // Calculate fiscal year
  let fiscalYear;
  if (month >= fiscalYearStart) {
    fiscalYear = year;
  } else {
    fiscalYear = year - 1;
  }
  
  // Calculate quarter
  let quarter;
  const adjustedMonth = ((month - fiscalYearStart + 12) % 12) + 1;
  quarter = Math.ceil(adjustedMonth / 3);
  
  // Calculate quarter start and end dates
  const quarterStartMonth = fiscalYearStart + (quarter - 1) * 3;
  let qStartYear = fiscalYear;
  let actualQStartMonth = quarterStartMonth;
  
  if (quarterStartMonth > 12) {
    actualQStartMonth = quarterStartMonth - 12;
    qStartYear = fiscalYear + 1;
  }
  
  const quarterStart = new Date(qStartYear, actualQStartMonth - 1, 1);
  const quarterEnd = new Date(qStartYear, actualQStartMonth + 2, 0); // Last day of third month
  
  // Fiscal year end
  const fiscalYearEnd = new Date(fiscalYear + 1, fiscalYearStart - 1, 0);
  
  return {
    date: date,
    fiscalYear: `FY${fiscalYear}/${String(fiscalYear + 1).slice(2)}`,
    quarter: `Q${quarter}`,
    quarterStart: quarterStart.toISOString().split('T')[0],
    quarterEnd: quarterEnd.toISOString().split('T')[0],
    fiscalYearEnd: fiscalYearEnd.toISOString().split('T')[0]
  };
}

// Generate requirement IDs
function generateRequirementIds(prefix, startNumber, count, padding = 3) {
  const ids = [];
  for (let i = 0; i < count; i++) {
    const num = startNumber + i;
    const paddedNum = String(num).padStart(padding, '0');
    ids.push(`${prefix}-${paddedNum}`);
  }
  return ids;
}

// Convert story points to hours
function convertStoryPointsToHours(storyPoints, pointToHourRatio = DEFAULT_POINT_RATIO, overheadFactor = DEFAULT_OVERHEAD) {
  const baseHours = storyPoints * pointToHourRatio;
  const overheadHours = baseHours * overheadFactor;
  const totalHours = baseHours + overheadHours;
  
  return {
    storyPoints: storyPoints,
    pointToHourRatio: pointToHourRatio,
    baseHours: Math.round(baseHours * 10) / 10,
    overheadHours: Math.round(overheadHours * 10) / 10,
    overheadPercentage: overheadFactor * 100,
    totalHours: Math.round(totalHours * 10) / 10,
    workingDays: Math.round((totalHours / 8) * 10) / 10
  };
}

// Convert between estimation systems
function convertEstimation(value, fromSystem, toSystem) {
  const conversions = {
    'tshirt_to_points': {
      'XS': 1, 'S': 2, 'M': 3, 'L': 5, 'XL': 8, 'XXL': 13
    },
    'points_to_tshirt': {
      1: 'XS', 2: 'S', 3: 'M', 5: 'L', 8: 'XL', 13: 'XXL'
    },
    'tshirt_to_hours': {
      'XS': 4, 'S': 8, 'M': 12, 'L': 20, 'XL': 32, 'XXL': 52
    },
    'points_to_hours': {
      1: 4, 2: 8, 3: 12, 5: 20, 8: 32, 13: 52
    }
  };
  
  const conversionKey = `${fromSystem}_to_${toSystem}`;
  
  if (!conversions[conversionKey]) {
    return { error: `Conversion from ${fromSystem} to ${toSystem} not supported` };
  }
  
  const result = conversions[conversionKey][value];
  
  if (result === undefined) {
    return { error: `Value ${value} not found in ${fromSystem} system` };
  }
  
  return {
    originalValue: value,
    originalSystem: fromSystem,
    convertedValue: result,
    convertedSystem: toSystem
  };
}

// MoSCoW priority calculator
function calculateMoscowPriority(requirements) {
  // requirements: [{id, priority: 'Must'|'Should'|'Could'|'Won\'t', points}]
  const summary = {
    Must: { count: 0, points: 0, items: [] },
    Should: { count: 0, points: 0, items: [] },
    Could: { count: 0, points: 0, items: [] },
    Wont: { count: 0, points: 0, items: [] }
  };
  
  requirements.forEach(req => {
    const priority = req.priority === "Won't" ? 'Wont' : req.priority;
    if (summary[priority]) {
      summary[priority].count++;
      summary[priority].points += req.points || 0;
      summary[priority].items.push(req.id);
    }
  });
  
  const totalPoints = Object.values(summary).reduce((sum, cat) => sum + cat.points, 0);
  
  return {
    summary: summary,
    totalRequirements: requirements.length,
    totalPoints: totalPoints,
    percentages: {
      Must: Math.round((summary.Must.points / totalPoints) * 100) || 0,
      Should: Math.round((summary.Should.points / totalPoints) * 100) || 0,
      Could: Math.round((summary.Could.points / totalPoints) * 100) || 0,
      Wont: Math.round((summary.Wont.points / totalPoints) * 100) || 0
    }
  };
}

// MoSCoW capacity planner
function planMoscowCapacity(requirements, availableCapacity) {
  // Sort requirements by priority order
  const priorityOrder = { 'Must': 1, 'Should': 2, 'Could': 3, "Won't": 4 };
  const sorted = [...requirements].sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  let remainingCapacity = availableCapacity;
  const canCommit = [];
  const cannotCommit = [];
  
  sorted.forEach(req => {
    if (remainingCapacity >= (req.points || 0)) {
      canCommit.push(req);
      remainingCapacity -= (req.points || 0);
    } else {
      cannotCommit.push(req);
    }
  });
  
  return {
    availableCapacity: availableCapacity,
    committed: {
      items: canCommit,
      count: canCommit.length,
      totalPoints: canCommit.reduce((sum, r) => sum + (r.points || 0), 0)
    },
    deferred: {
      items: cannotCommit,
      count: cannotCommit.length,
      totalPoints: cannotCommit.reduce((sum, r) => sum + (r.points || 0), 0)
    },
    remainingCapacity: remainingCapacity
  };
}

// MoSCoW dependency validator
function validateMoscowDependencies(requirements) {
  // requirements: [{id, priority, dependsOn: [ids]}]
  const issues = [];
  const requirementMap = new Map(requirements.map(r => [r.id, r]));
  
  const priorityValue = { 'Must': 4, 'Should': 3, 'Could': 2, "Won't": 1 };
  
  requirements.forEach(req => {
    if (!req.dependsOn || req.dependsOn.length === 0) return;
    
    req.dependsOn.forEach(depId => {
      const dependency = requirementMap.get(depId);
      if (!dependency) {
        issues.push({
          requirement: req.id,
          issue: `Depends on ${depId} which doesn't exist`,
          severity: 'critical'
        });
        return;
      }
      
      const reqPriority = priorityValue[req.priority] || 0;
      const depPriority = priorityValue[dependency.priority] || 0;
      
      if (reqPriority > depPriority) {
        issues.push({
          requirement: req.id,
          priority: req.priority,
          dependsOn: depId,
          dependencyPriority: dependency.priority,
          issue: `${req.priority} priority depends on lower priority ${dependency.priority}`,
          severity: 'high'
        });
      }
      
      if (dependency.priority === "Won't" && req.priority !== "Won't") {
        issues.push({
          requirement: req.id,
          priority: req.priority,
          dependsOn: depId,
          issue: `Active requirement depends on Won't priority item`,
          severity: 'critical'
        });
      }
    });
  });
  
  return {
    valid: issues.length === 0,
    issuesFound: issues.length,
    issues: issues,
    summary: issues.length === 0 ? 
      'All dependencies are valid' : 
      `Found ${issues.length} dependency issue(s)`
  };
}

// MCP Server setup
const server = new Server(
  {
    name: 'ba-workflow-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'calculate_working_days',
        description: 'Calculate the number of working days between two dates (excluding weekends and UK bank holidays)',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format'
            }
          },
          required: ['startDate', 'endDate']
        }
      },
      {
        name: 'add_working_days',
        description: 'Add a specified number of working days to a date (excluding weekends and UK bank holidays)',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            daysToAdd: {
              type: 'number',
              description: 'Number of working days to add'
            }
          },
          required: ['startDate', 'daysToAdd']
        }
      },
      {
        name: 'subtract_working_days',
        description: 'Subtract a specified number of working days from a date (excluding weekends and UK bank holidays)',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            daysToSubtract: {
              type: 'number',
              description: 'Number of working days to subtract'
            }
          },
          required: ['startDate', 'daysToSubtract']
        }
      },
      {
        name: 'calculate_sprint_dates',
        description: 'Calculate start and end dates for multiple sprints, including working days per sprint',
        inputSchema: {
          type: 'object',
          properties: {
            sprintStart: {
              type: 'string',
              description: 'Sprint 1 start date in YYYY-MM-DD format'
            },
            sprintLength: {
              type: 'number',
              description: 'Length of each sprint in weeks (typically 2)'
            },
            numberOfSprints: {
              type: 'number',
              description: 'Number of sprints to calculate'
            }
          },
          required: ['sprintStart', 'sprintLength', 'numberOfSprints']
        }
      },
      {
        name: 'format_user_story',
        description: 'Format a user story following the standard BA template with requirement, placement, behavior, and acceptance criteria',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'User role (e.g., "Care Home Manager", "System Administrator")'
            },
            feature: {
              type: 'string',
              description: 'Feature or functionality requested'
            },
            businessValue: {
              type: 'string',
              description: 'Business value or benefit'
            },
            placement: {
              type: 'string',
              description: 'Where on the page (e.g., "Header", "Sidebar", "Main Content")'
            },
            visualType: {
              type: 'string',
              description: 'Visual type (e.g., "button", "dropdown", "list", "modal")'
            },
            behavior: {
              type: 'string',
              description: 'Expected behavior when user interacts with the feature'
            },
            extraInfo: {
              type: 'string',
              description: 'Technical details, dependencies, API calls, etc. (optional)'
            },
            acceptanceCriteria: {
              type: 'string',
              description: 'Acceptance criteria in Given/When/Then format or as an array of criteria objects'
            }
          },
          required: ['role', 'feature', 'businessValue', 'placement', 'visualType', 'behavior', 'acceptanceCriteria']
        }
      },
      {
        name: 'convert_timezone',
        description: 'Convert a time from one timezone to another',
        inputSchema: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
              description: 'Time in HH:MM format (24-hour)'
            },
            fromTimezone: {
              type: 'string',
              description: 'Source timezone (e.g., GMT, EST, PST, AEST, IST, CET, MYT)'
            },
            toTimezone: {
              type: 'string',
              description: 'Target timezone (e.g., GMT, EST, PST, AEST, IST, CET, MYT)'
            }
          },
          required: ['time', 'fromTimezone', 'toTimezone']
        }
      },
      {
        name: 'find_meeting_time',
        description: 'Find suitable meeting times that work across multiple timezones',
        inputSchema: {
          type: 'object',
          properties: {
            participants: {
              type: 'array',
              description: 'Array of participant objects with name, timezone, and available hours',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  timezone: { type: 'string' },
                  availableHours: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2
                  }
                }
              }
            },
            duration: {
              type: 'number',
              description: 'Meeting duration in hours'
            }
          },
          required: ['participants']
        }
      },
      {
        name: 'text_utilities',
        description: 'Perform various text operations: word_count, char_count, remove_duplicates, sort_lines, extract_emails, extract_urls, to_uppercase, to_lowercase, to_title_case, trim_whitespace, add_line_numbers',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'Operation to perform',
              enum: ['word_count', 'char_count', 'remove_duplicates', 'sort_lines', 'extract_emails', 'extract_urls', 'to_uppercase', 'to_lowercase', 'to_title_case', 'trim_whitespace', 'add_line_numbers']
            },
            text: {
              type: 'string',
              description: 'Text to process'
            },
            options: {
              type: 'object',
              description: 'Optional parameters (e.g., {reverse: true} for sort_lines)',
              properties: {
                reverse: { type: 'boolean' }
              }
            }
          },
          required: ['operation', 'text']
        }
      },
      {
        name: 'calculate_release_date',
        description: 'Calculate estimated release date based on story points remaining, team velocity, and sprint length',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            storyPointsRemaining: {
              type: 'number',
              description: 'Total story points remaining in backlog'
            },
            teamVelocity: {
              type: 'number',
              description: 'Average team velocity (points per sprint)'
            },
            sprintLength: {
              type: 'number',
              description: 'Sprint length in weeks (typically 2)'
            }
          },
          required: ['startDate', 'storyPointsRemaining', 'teamVelocity', 'sprintLength']
        }
      },
      {
        name: 'calculate_velocity',
        description: 'Calculate team velocity and adjusted capacity based on historical sprint data',
        inputSchema: {
          type: 'object',
          properties: {
            completedPoints: {
              type: 'array',
              description: 'Array of completed story points per sprint (e.g., [28, 32, 25, 30])',
              items: { type: 'number' }
            },
            capacityAdjustments: {
              type: 'object',
              description: 'Optional capacity adjustments',
              properties: {
                daysOff: { 
                  type: 'number',
                  description: 'Total team days off this sprint (e.g., 2 people x 1 day = 2)'
                },
                teamSize: { 
                  type: 'number',
                  description: 'Team size (default: 5)'
                },
                sprintLength: {
                  type: 'number',
                  description: 'Sprint length in weeks (default: 2)'
                },
                adjustmentFactor: { 
                  type: 'number',
                  description: 'Adjustment factor for team changes (default: 1.0)'
                }
              }
            }
          },
          required: ['completedPoints']
        }
      },
      {
        name: 'calculate_fiscal_quarter',
        description: 'Calculate fiscal quarter, fiscal year, and quarter dates (UK fiscal year starts April 1 by default)',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format'
            },
            fiscalYearStart: {
              type: 'number',
              description: 'Fiscal year start month (1-12, default: 4 for April)'
            }
          },
          required: ['date']
        }
      },
      {
        name: 'generate_requirement_ids',
        description: 'Generate a sequence of requirement IDs with consistent format (e.g., REQ-001, REQ-002, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: {
              type: 'string',
              description: 'ID prefix (e.g., REQ, US, AC, TC)'
            },
            startNumber: {
              type: 'number',
              description: 'Starting number'
            },
            count: {
              type: 'number',
              description: 'How many IDs to generate'
            },
            padding: {
              type: 'number',
              description: 'Number of digits with zero padding (default: 3)'
            }
          },
          required: ['prefix', 'startNumber', 'count']
        }
      },
      {
        name: 'convert_points_to_hours',
        description: 'Convert story points to hours with configurable ratio and overhead factor',
        inputSchema: {
          type: 'object',
          properties: {
            storyPoints: {
              type: 'number',
              description: 'Story points to convert'
            },
            pointToHourRatio: {
              type: 'number',
              description: 'Hours per story point (default: 4)'
            },
            overheadFactor: {
              type: 'number',
              description: 'Overhead as decimal (default: 0.2 for 20% overhead)'
            }
          },
          required: ['storyPoints']
        }
      },
      {
        name: 'convert_estimation',
        description: 'Convert between estimation systems: T-shirt (XS/S/M/L/XL/XXL) ↔ Story Points ↔ Hours',
        inputSchema: {
          type: 'object',
          properties: {
            value: {
              description: 'Value to convert (e.g., "L", 5, 20)'
            },
            fromSystem: {
              type: 'string',
              description: 'Source system',
              enum: ['tshirt', 'points', 'hours']
            },
            toSystem: {
              type: 'string',
              description: 'Target system',
              enum: ['tshirt', 'points', 'hours']
            }
          },
          required: ['value', 'fromSystem', 'toSystem']
        }
      },
      {
        name: 'calculate_moscow_priority',
        description: 'Calculate MoSCoW priority breakdown showing counts, story points, and percentages',
        inputSchema: {
          type: 'object',
          properties: {
            requirements: {
              type: 'array',
              description: 'Array of requirements with id, priority (Must/Should/Could/Won\'t), and points',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  priority: { type: 'string' },
                  points: { type: 'number' }
                }
              }
            }
          },
          required: ['requirements']
        }
      },
      {
        name: 'plan_moscow_capacity',
        description: 'Plan sprint capacity based on MoSCoW priorities - shows what fits in available capacity',
        inputSchema: {
          type: 'object',
          properties: {
            requirements: {
              type: 'array',
              description: 'Array of requirements with id, priority, and points',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  priority: { type: 'string' },
                  points: { type: 'number' }
                }
              }
            },
            availableCapacity: {
              type: 'number',
              description: 'Available capacity in story points'
            }
          },
          required: ['requirements', 'availableCapacity']
        }
      },
      {
        name: 'validate_moscow_dependencies',
        description: 'Validate MoSCoW dependencies - finds issues like Must-haves depending on Could-haves or Won\'t items',
        inputSchema: {
          type: 'object',
          properties: {
            requirements: {
              type: 'array',
              description: 'Array of requirements with id, priority, and dependsOn array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  priority: { type: 'string' },
                  dependsOn: { 
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          },
          required: ['requirements']
        }
      }
    ]
  };
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'calculate_working_days': {
        const workingDays = calculateWorkingDaysBetween(
          new Date(args.startDate),
          new Date(args.endDate)
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              startDate: args.startDate,
              endDate: args.endDate,
              workingDays: workingDays
            }, null, 2)
          }]
        };
      }

      case 'add_working_days': {
        const resultDate = addWorkingDays(
          new Date(args.startDate),
          args.daysToAdd
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              startDate: args.startDate,
              daysAdded: args.daysToAdd,
              resultDate: resultDate.toISOString().split('T')[0]
            }, null, 2)
          }]
        };
      }

      case 'subtract_working_days': {
        const resultDate = subtractWorkingDays(
          new Date(args.startDate),
          args.daysToSubtract
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              startDate: args.startDate,
              daysSubtracted: args.daysToSubtract,
              resultDate: resultDate.toISOString().split('T')[0]
            }, null, 2)
          }]
        };
      }

      case 'calculate_sprint_dates': {
        const sprints = calculateSprintDates(
          args.sprintStart,
          args.sprintLength,
          args.numberOfSprints
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              sprintLength: `${args.sprintLength} weeks`,
              sprints: sprints
            }, null, 2)
          }]
        };
      }

      case 'format_user_story': {
        const formattedStory = formatUserStory(
          args.role,
          args.feature,
          args.businessValue,
          args.placement,
          args.visualType,
          args.behavior,
          args.extraInfo || '',
          args.acceptanceCriteria
        );
        return {
          content: [{
            type: 'text',
            text: formattedStory
          }]
        };
      }

      case 'convert_timezone': {
        const converted = convertTimezone(
          args.time,
          args.fromTimezone,
          args.toTimezone
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              originalTime: args.time,
              originalTimezone: args.fromTimezone,
              convertedTime: converted.time,
              convertedTimezone: args.toTimezone,
              dayOffset: converted.dayOffset,
              note: converted.dayOffset !== 0 ? 
                `${converted.dayOffset > 0 ? 'Next' : 'Previous'} day` : 
                'Same day'
            }, null, 2)
          }]
        };
      }

      case 'find_meeting_time': {
        const suggestions = findMeetingTime(
          args.participants,
          args.duration || 1,
          [9, 17]
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              suitableTimes: suggestions,
              totalSuggestions: suggestions.length
            }, null, 2)
          }]
        };
      }

      case 'text_utilities': {
        const result = performTextOperation(
          args.operation,
          args.text,
          args.options || {}
        );
        return {
          content: [{
            type: 'text',
            text: typeof result === 'number' ? 
              JSON.stringify({ operation: args.operation, result: result }) :
              result
          }]
        };
      }

      case 'calculate_release_date': {
        const releaseInfo = calculateReleaseDate(
          args.startDate,
          args.storyPointsRemaining,
          args.teamVelocity,
          args.sprintLength
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(releaseInfo, null, 2)
          }]
        };
      }

      case 'calculate_velocity': {
        const velocityInfo = calculateVelocity(
          args.completedPoints,
          args.capacityAdjustments || {}
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(velocityInfo, null, 2)
          }]
        };
      }

      case 'calculate_fiscal_quarter': {
        const fiscalInfo = calculateFiscalInfo(
          args.date,
          args.fiscalYearStart || FISCAL_YEAR_START
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(fiscalInfo, null, 2)
          }]
        };
      }

      case 'generate_requirement_ids': {
        const ids = generateRequirementIds(
          args.prefix,
          args.startNumber,
          args.count,
          args.padding || 3
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              prefix: args.prefix,
              startNumber: args.startNumber,
              count: args.count,
              ids: ids
            }, null, 2)
          }]
        };
      }

      case 'convert_points_to_hours': {
        const conversion = convertStoryPointsToHours(
          args.storyPoints,
          args.pointToHourRatio || DEFAULT_POINT_RATIO,
          args.overheadFactor || DEFAULT_OVERHEAD
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(conversion, null, 2)
          }]
        };
      }

      case 'convert_estimation': {
        const result = convertEstimation(
          args.value,
          args.fromSystem,
          args.toSystem
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'calculate_moscow_priority': {
        const moscowSummary = calculateMoscowPriority(args.requirements);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(moscowSummary, null, 2)
          }]
        };
      }

      case 'plan_moscow_capacity': {
        const capacityPlan = planMoscowCapacity(
          args.requirements,
          args.availableCapacity
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(capacityPlan, null, 2)
          }]
        };
      }

      case 'validate_moscow_dependencies': {
        const validation = validateMoscowDependencies(args.requirements);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(validation, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BA Workflow Tools MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
