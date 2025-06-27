// backend/src/services/monitoring.ts
import { TelemetryClient } from 'applicationinsights';
import * as appInsights from 'applicationinsights';
import { logger } from '../utils/logger';

let telemetryClient: TelemetryClient | null = null;

export function initializeApplicationInsights() {
  const instrumentationKey = process.env.AZURE_APPLICATION_INSIGHTS_INSTRUMENTATION_KEY;
  const connectionString = process.env.AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING;
  
  if (!instrumentationKey && !connectionString) {
    logger.warn('Application Insights instrumentation key or connection string not found');
    return;
  }

  try {
    // Initialize Application Insights
    if (connectionString) {
      appInsights.setup(connectionString)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true);
    } else if (instrumentationKey) {
      appInsights.setup(instrumentationKey)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true);
    } else {
      logger.warn('No Application Insights configuration found');
      return;
    }
    
    // Set cloud role name for better telemetry organization
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'smlgpt-v2-backend';
    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRoleInstance] = 'backend-instance-1';
    
    appInsights.start();
    telemetryClient = appInsights.defaultClient;
    
    logger.info('Application Insights initialized successfully');
    trackEvent('ApplicationInsights_Initialized', { 
      service: 'smlgpt-v2-backend',
      version: '2.0.0'
    });
  } catch (error) {
    logger.error('Failed to initialize Application Insights:', error);
  }
}

// Custom telemetry helpers
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  if (telemetryClient) {
    telemetryClient.trackEvent({ name, properties });
    logger.info(`Event tracked: ${name}`, properties);
  }
};

export const trackMetric = (name: string, value: number, properties?: Record<string, any>) => {
  if (telemetryClient) {
    telemetryClient.trackMetric({ name, value, properties });
    logger.info(`Metric tracked: ${name} = ${value}`, properties);
  }
};

export const trackDependency = (name: string, data: string, duration: number, success: boolean, properties?: Record<string, any>) => {
  if (telemetryClient) {
    telemetryClient.trackDependency({
      name,
      data,
      duration,
      success,
      dependencyTypeName: 'Azure Service',
      properties
    });
    logger.info(`Dependency tracked: ${name} - ${success ? 'SUCCESS' : 'FAILURE'} (${duration}ms)`);
  }
};

export const trackException = (error: Error, properties?: Record<string, any>) => {
  if (telemetryClient) {
    telemetryClient.trackException({ exception: error, properties });
    logger.error(`Exception tracked: ${error.message}`, properties);
  }
};

export const trackRequest = (name: string, url: string, duration: number, resultCode: string, success: boolean, properties?: Record<string, any>) => {
  if (telemetryClient) {
    telemetryClient.trackRequest({
      name,
      url,
      duration,
      resultCode,
      success,
      properties
    });
    logger.info(`Request tracked: ${name} - ${resultCode} (${duration}ms)`);
  }
};
