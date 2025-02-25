import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to templates and styles
const templatesDir = path.join(__dirname, '..', 'templates');
const stylesDir = path.join(__dirname, '..', 'styles');

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
 * Read styles from disk or cache
 */
function getStyles(): string {
  const stylePath = path.join(stylesDir, 'main.css');
  
  if (!styleCache[stylePath]) {
    styleCache[stylePath] = fs.readFileSync(stylePath, 'utf-8');
  }
  
  return styleCache[stylePath];
}

/**
 * Render a template with the provided data
 */
export function render(templateName: string, data: Record<string, any>): string {
  // Get the base template
  const baseTemplate = getTemplate('base');
  
  // Get the specific template
  const specificTemplate = getTemplate(templateName);
  
  // Get the CSS
  const styles = getStyles();
  
  // Render the specific template with the provided data
  const renderedContent = specificTemplate(data);
  
  // Combine with the base template
  const combinedData = {
    ...data,
    content: renderedContent,
    styles
  };
  
  // Render the final HTML
  return baseTemplate(combinedData);
} 