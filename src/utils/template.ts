import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { config } from '../config.js';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to templates and styles in the new ui directory
const templatesDir = path.join(__dirname, '..', 'ui', 'templates');
const stylesDir = path.join(__dirname, '..', 'ui', 'styles');

// Register Handlebars helpers
// The #each helper is built-in, but we'll add any other custom helpers here
Handlebars.registerHelper('ifEquals', function(
  this: any,
  arg1: any, 
  arg2: any, 
  options: Handlebars.HelperOptions
) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotEquals', function(
  this: any,
  arg1: any, 
  arg2: any, 
  options: Handlebars.HelperOptions
) {
  return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
});

// Helper for degree nodes
Handlebars.registerHelper('times', function(
  this: any,
  n: number, 
  options: Handlebars.HelperOptions
) {
  let result = '';
  for (let i = 0; i < n; i++) {
    // Create a context object with index
    const context = { ...this, '@index': i + 1 };
    
    // Add first/last flags
    context['@first'] = (i === 0);
    context['@last'] = (i === n - 1);
    
    result += options.fn(context);
  }
  return result;
});

// Simple equality helper
Handlebars.registerHelper('eq', function(
  this: any,
  a: any, 
  b: any
) {
  return a === b;
});

// Subtraction helper
Handlebars.registerHelper('subtract', function(
  this: any,
  a: number, 
  b: number
) {
  return a - b;
});

// Add this to your existing Handlebars helpers
Handlebars.registerHelper('multiply', function(a, b) {
  return a * b;
});

// Cache for compiled templates and styles
const templateCache: Record<string, Handlebars.TemplateDelegate> = {};
const styleCache: Record<string, string> = {};

/**
 * Read and compile a template from disk or cache
 */
function getTemplate(templateName: string): Handlebars.TemplateDelegate {
  const templatePath = path.join(templatesDir, `${templateName}.html`);
  
  if (!templateCache[templatePath]) {
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    templateCache[templatePath] = Handlebars.compile(templateSource);
  }
  
  return templateCache[templatePath];
}

/**
 * Get styles for embedding in templates
 */
function getStyles(): string {
  try {
    // No longer loading styles from file since we're using external CSS
    return ''; // Return empty string instead of trying to load file
    
    // Or alternatively, point to new location:
    // return fs.readFileSync(path.join(process.cwd(), 'public/static/styles.css'), 'utf8');
  } catch (error) {
    console.warn('Could not load styles:', error);
    return '';
  }
}

/**
 * Render a template with the provided data
 */
export function render(templateName: string, data?: any) {
  const fullData = {
    ...(data || {}),
    isDev: config.isDev,
    // Add any other global template data here
  };
  
  return renderTemplate(templateName, fullData);
}

function renderTemplate(templateName: string, data: Record<string, any>): string {
  // Get the specific template
  const specificTemplate = getTemplate(templateName);
  
  // Set default title if not provided
  data.title = data.title || 'Six Degrees of Farcaster';
  
  // Get the CSS
  const styles = getStyles();
  
  // First render the specific template with the provided data
  const contentHtml = specificTemplate(data);
  
  // Then get and render the base template with the content
  const baseTemplate = getTemplate('base');
  
  // Create combined data with the rendered content
  const combinedData = {
    ...data,
    content: contentHtml,
    styles
  };
  
  // Render the final HTML
  return baseTemplate(combinedData);
} 