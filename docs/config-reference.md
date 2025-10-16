---
title: Configuration Reference
---

<script setup>
import { data as schema } from './config-reference.data'

// Helper to format property type
const formatType = (prop) => {
  if (prop.type === 'string' && prop.format === 'email') return 'Email'
  if (prop.type === 'string' && prop.const) return `"${prop.const}"`
  if (prop.type === 'integer') return 'Integer'
  if (prop.type === 'string') return 'String'
  if (prop.type === 'object') return 'Object'
  if (prop.type === 'array') return 'Array'
  return prop.type || 'Unknown'
}

// Check if a property is required
const isRequired = (parentRequired, key) => {
  return parentRequired?.includes(key) ? 'Yes' : 'No'
}

// Get account types from schema
const getAccountTypes = () => {
  const accountsProperty = schema.properties?.accounts
  if (!accountsProperty?.items?.anyOf) return []

  return accountsProperty.items.anyOf.map(typeSchema => {
    const typeValue = typeSchema.properties?.type?.const
    return {
      type: typeValue,
      schema: typeSchema
    }
  })
}

const accountTypes = getAccountTypes()

// Helper to format connector type name (e.g., "uk_student_loan" -> "Uk Student Loan")
const formatConnectorName = (type) => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Helper to format connector slug (e.g., "uk_student_loan" -> "uk-student-loan")
const formatConnectorSlug = (type) => {
  return type.replace(/_/g, '-')
}

// Get top-level properties (excluding 'accounts' which we handle separately)
const getTopLevelSections = () => {
  const props = schema.properties || {}
  return Object.entries(props)
    .filter(([key]) => key !== 'accounts')
    .map(([key, prop]) => ({ key, prop }))
}

const topLevelSections = getTopLevelSections()

// Get common account fields (fields that appear in all account types)
const getCommonAccountFields = () => {
  if (accountTypes.length === 0) return []

  const firstType = accountTypes[0].schema.properties
  const commonFields = []

  for (const [key, prop] of Object.entries(firstType)) {
    // Check if this field exists in all account types
    const isCommon = accountTypes.every(at => at.schema.properties[key])
    if (isCommon) {
      commonFields.push({ key, prop })
    }
  }

  return commonFields
}

const commonAccountFields = getCommonAccountFields()

// Generate example value from schema property
const generateExampleValue = (key, prop) => {
  if (prop.const) return `"${prop.const}"`
  if (prop.default !== undefined) return prop.default

  if (prop.type === 'string') {
    if (prop.format === 'email') return '"your@email.com"'
    if (key.toLowerCase().includes('token')) return '"your-token"'
    if (key.toLowerCase().includes('key')) return `"your-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}"`
    if (key.toLowerCase().includes('id')) return `"your-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}"`
    if (key.toLowerCase().includes('password')) return '"your-password"'
    if (key.toLowerCase().includes('endpoint')) return '"wss://chrome.browserless.io?token=YOUR_TOKEN"'
    if (key === 'interval') return '"0 2 * * *"'
    if (key === 'name') return '"My Account"'
    if (key.toLowerCase().includes('username')) return '"your-username"'
    if (key.toLowerCase().includes('answer')) return '"your-answer"'
    if (key.toLowerCase().includes('number')) return '"your-number"'
    return `"your-${key}"`
  }

  if (prop.type === 'integer' || prop.type === 'number') {
    return prop.default !== undefined ? prop.default : 0
  }

  return '""'
}

// Generate YAML for an object
const generateYamlObject = (properties, required = [], indent = 0) => {
  const indentStr = '  '.repeat(indent)
  const lines = []

  for (const [key, prop] of Object.entries(properties)) {
    const value = generateExampleValue(key, prop)
    const comment = !required?.includes(key) ? '  # Optional' : ''

    if (prop.default !== undefined && !required?.includes(key)) {
      lines.push(`${indentStr}${key}: ${value}${comment}, defaults to ${prop.default}`)
    } else {
      lines.push(`${indentStr}${key}: ${value}${comment}`)
    }
  }

  return lines.join('\n')
}

// Generate example YAML for an account type
const generateAccountExample = (accountType, index) => {
  const lines = []
  const indent = '  '

  // Generate a descriptive name based on the type
  const typeName = formatConnectorName(accountType.type)
  const exampleNames = {
    'trading212': 'My Trading 212',
    'uk_student_loan': 'Student Loan',
    'standard_life_pension': 'My Pension'
  }

  const exampleIntervals = {
    'trading212': '0 * * * *',
    'uk_student_loan': '0 2 * * *',
    'standard_life_pension': '0 3 * * 1'
  }

  const intervalComments = {
    'trading212': '  # Every hour',
    'uk_student_loan': '  # Daily at 2 AM',
    'standard_life_pension': '  # Weekly on Monday at 3 AM'
  }

  lines.push(`${indent}- name: "${exampleNames[accountType.type] || typeName}"`)
  lines.push(`${indent}  type: "${accountType.type}"`)
  lines.push(`${indent}  interval: "${exampleIntervals[accountType.type] || '0 2 * * *'}"${intervalComments[accountType.type] || ''}`)
  lines.push(`${indent}  ynabAccountId: "your-ynab-account-id"`)

  // Add connector-specific fields
  for (const [key, prop] of Object.entries(accountType.schema.properties)) {
    if (!['name', 'type', 'interval', 'ynabAccountId'].includes(key)) {
      const value = generateExampleValue(key, prop)
      lines.push(`${indent}  ${key}: ${value}`)
    }
  }

  return lines.join('\n')
}

// Generate complete example YAML
const generateExampleYaml = () => {
  const lines = []

  // Generate top-level sections (ynab, browser, server)
  for (const section of topLevelSections) {
    lines.push(`${section.key}:`)
    const sectionLines = generateYamlObject(section.prop.properties, section.prop.required, 1)
    lines.push(sectionLines)
    lines.push('')
  }

  // Generate accounts array
  lines.push('accounts:')
  for (let i = 0; i < accountTypes.length; i++) {
    lines.push(generateAccountExample(accountTypes[i], i))
    if (i < accountTypes.length - 1) {
      lines.push('')
    }
  }

  return lines.join('\n')
}

const exampleYaml = generateExampleYaml()
</script>

# Configuration Reference

{{ schema.description }}

## Top-Level Configuration

The configuration file is a YAML file with the following top-level properties:

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="section in topLevelSections" :key="section.key">
<td><code>{{ section.key }}</code></td>
<td>{{ formatType(section.prop) }}</td>
<td>{{ isRequired(schema.required, section.key) }}</td>
<td>{{ section.prop.description || '' }}</td>
</tr>
<tr>
<td><code>accounts</code></td>
<td>Array</td>
<td>{{ isRequired(schema.required, 'accounts') }}</td>
<td>{{ schema.properties?.accounts?.description || '' }}</td>
</tr>
</tbody>
</table>

<div v-for="section in topLevelSections" :key="section.key">

## {{ section.key.charAt(0).toUpperCase() + section.key.slice(1) }} Configuration

{{ section.prop.description }}

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th v-if="section.prop.default">Default</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="(prop, key) in section.prop.properties" :key="key">
<td><code>{{ key }}</code></td>
<td>{{ formatType(prop) }}</td>
<td>{{ isRequired(section.prop.required, key) }}</td>
<td v-if="section.prop.default">{{ prop.default !== undefined ? prop.default : '-' }}</td>
<td>{{ prop.description || '' }}</td>
</tr>
</tbody>
</table>

<div v-if="section.key === 'ynab'">

See the [Create YNAB Token](/guide/create-ynab-token) guide for instructions on obtaining these values.

</div>

<div v-if="section.key === 'browser'">

See the [Browser](/browser) documentation for more information.

</div>

</div>

## Accounts Configuration

{{ schema.properties?.accounts?.description }}

### Common Account Fields

All account types share these fields:

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="field in commonAccountFields" :key="field.key">
<td><code>{{ field.key }}</code></td>
<td>{{ formatType(field.prop) }}</td>
<td>Yes</td>
<td>{{ field.prop.description || '' }}</td>
</tr>
</tbody>
</table>

### Account Types

<div v-for="accountType in accountTypes" :key="accountType.type">

#### {{ formatConnectorName(accountType.type) }}

**Type:** `{{ accountType.type }}`

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="(prop, key) in accountType.schema.properties" :key="key" v-if="!commonAccountFields.some(f => f.key === key)">
<td><code>{{ key }}</code></td>
<td>{{ formatType(prop) }}</td>
<td>{{ isRequired(accountType.schema.required, key) }}</td>
<td>{{ prop.description || '' }}</td>
</tr>
</tbody>
</table>

<p>See the <a :href="`/connectors/${formatConnectorSlug(accountType.type)}`">{{ formatConnectorName(accountType.type) }}</a> connector documentation for setup instructions.</p>

</div>

## Example Configuration

Here's a complete example showing all configuration options:

<div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki-themes github-light github-dark vp-code"><code>{{ exampleYaml }}</code></pre></div>

## Notes

- You can configure multiple accounts of the same type
- The `interval` field uses cron syntax. Use [crontab.guru](https://crontab.guru/) to help create cron expressions
- Make sure each account has a unique `name`
- The configuration file should be placed at `/config.yaml` in production, or in the project root for development
