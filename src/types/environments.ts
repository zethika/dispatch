export interface EnvironmentFile {
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  secret: boolean;
}

export interface EnvironmentSummary {
  slug: string;
  name: string;
}
