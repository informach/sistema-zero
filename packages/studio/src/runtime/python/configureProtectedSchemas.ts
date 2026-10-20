import { configureStudioPythonCspSchemas } from '@sistemazero/core/studio/python-csp-schema'
import { config } from 'zod'

// Core and Studio can resolve different Zod versions. Configure both before any
// schema imports; strict CSP already forbids their dynamic compilation probe.
configureStudioPythonCspSchemas()
config({ jitless: true })
