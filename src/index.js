const {showFiglet} = require('./utils')
const {start, background} = require('./App')


const program = require('commander');
const pkg = require('../package.json');


program
.usage('[options]')
.version(pkg.version)
.option('-b, --background', 'run aqmthai in non-interactive mode')

program.parse(process.argv);


if (program.background) {
  showFiglet()
  background()
} else {
  showFiglet()
  start()
}
