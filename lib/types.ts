export type AvailabilitySlot = {
    day: string;
    start: string;
    end: string;
  };
  
  export type Availability = {
    slots: AvailabilitySlot[];
  };
  
  export type UserProfile = {
    githubUsername: string;
    skills: string[];
    availability: Availability;
  };
  
  export type Issue = {
    id: number;
    number: number;
    title: string;
    body: string;
    labels: string[];
    url: string;
  };
  
  export type ClassifiedIssue = Issue & {
    stack: string;
    difficulty: "easy" | "medium" | "hard";
    estimatedHours: number;
    fitScore: number;
    whyFit: string;
  };
  
  export type Recommendation = {
    issueNumber: number;
    title: string;
    estimatedHours: number;
    fitScore: number;
    whyFit: string;
    labels: string[];
  };
  
  export type SessionPlan = {
    sessionNumber: number;
    durationHours: number;
    goals: string[];
  };
  
  export type AutonomousPlan = {
    simpleExplanation: string;
    relevantFiles: { path: string; why: string }[];
    steps: string[];
    estimatedHours: number;
    sessions: SessionPlan[];
  };