import handlebars from 'handlebars';
import path from 'path';


export const renderTemplate = (templateName: string, data: any) => {
  const template = handlebars.compile(
    require('fs').readFileSync(path.join(__dirname, 'templates', `${templateName}.hbs`), 'utf8')
  );
  handlebars.registerPartial('styles', require('fs').readFileSync(path.join(__dirname, 'templates/partials/styles.hbs'), 'utf8'));
  handlebars.registerPartial('base', require('fs').readFileSync(path.join(__dirname, 'templates/layouts/base.hbs'), 'utf8'));
  return template(data);
};