/**
 * OpenTelemetry tracing setup
 * This is optional and only activates if OTEL_EXPORTER_OTLP_ENDPOINT is set
 */

let tracingInitialized = false

export function initializeTracing() {
  if (tracingInitialized) {
    return
  }

  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!otlpEndpoint) {
    console.log('OpenTelemetry: Disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)')
    return
  }

  try {
    // Dynamic import to avoid errors if package not installed
    const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
    const { Resource } = require('@opentelemetry/resources')
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
    const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base')
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc')
    const { registerInstrumentations } = require('@opentelemetry/instrumentation')
    const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
    const { PinoInstrumentation } = require('@opentelemetry/instrumentation-pino')

    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'icon-library',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      }),
    })

    const exporter = new OTLPTraceExporter({
      url: otlpEndpoint,
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
    provider.register()

    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new PinoInstrumentation({
          disableLogCorrelation: false,
        }),
      ],
    })

    tracingInitialized = true
    console.log(`OpenTelemetry: Enabled (exporting to ${otlpEndpoint})`)
  } catch (error) {
    console.warn('OpenTelemetry: Failed to initialize - package not installed or misconfigured')
    console.debug('To enable tracing, install: @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-grpc @opentelemetry/instrumentation-pino')
  }
}

/**
 * Get span from current context
 */
export function getActiveSpan() {
  try {
    const { trace } = require('@opentelemetry/api')
    const span = trace.getActiveSpan()
    return span
  } catch {
    return null
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>) {
  const span = getActiveSpan()
  if (span) {
    span.addEvent(name, attributes)
  }
}

/**
 * Record exception in current span
 */
export function recordException(error: Error) {
  const span = getActiveSpan()
  if (span) {
    span.recordException(error)
  }
}

/**
 * Set attribute on current span
 */
export function setSpanAttribute(key: string, value: any) {
  const span = getActiveSpan()
  if (span) {
    span.setAttribute(key, value)
  }
}

// Auto-initialize on module load if env var is set
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  initializeTracing()
}
