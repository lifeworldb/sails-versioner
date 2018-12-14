/**
 * Module dependencies
 */

var util = require('util');
var path = require('path');
var _ = require('lodash');
_.defaults = require('merge-defaults');
var pluralize = require('pluralize');
var colors = require('colors');
var fs = require('fs');
var fse = require('fs-extra')
require('dotenv').config();


/**
 * @sebas/sails-generate-cts
 *
 * Usage:
 * `sails generate cts`
 *
 * @description Generates a cts.
 * @docs https://sailsjs.com/docs/concepts/extending-sails/generators/custom-generators
 */

var TEMPLATES_PATH = path.resolve(__dirname, './templates');

//
// • Fetch static template string for embedded action, and precompile it into a template function.
var EMBEDDED_ACTION_TEMPLATE_PATH = path.resolve(TEMPLATES_PATH,'./actions-embedded.template')
var EMBEDDED_ACTION_TEMPLATE_STR = fs.readFileSync(EMBEDDED_ACTION_TEMPLATE_PATH,'utf8')
var EMBEDDED_ACTION_TEMPLATE_FN = _.template(EMBEDDED_ACTION_TEMPLATE_STR)
var API_DOMAIN = process.env.DOMAIN_API
var version = ''

module.exports = {

  /**
   * `before()` is run before executing any of the `targets`
   * defined below.
   *
   * This is where we can validate user input, configure default
   * scope variables, get extra dependencies, and so on.
   *
   * @param  {Dictionary} scope
   * @param  {Function} done [callback]
   */

  before: function (scope, done) {

    var selectTemplate = 1;

    _.defaults(scope, {
      createAt: new Date(),
      id: scope.args[0],
      actions: scope.args.slice(2)
    });

    if (!scope.args[0]) {
      return done('Usage: sails generate sv <controller or version> <name or new>');
    }

    if (scope.args[0] == 'controller' && !scope.args[1] || scope.args[0] == 'c' && !scope.args[1]) {
      return done('Usage: sails generate sv controller <name> [actions]'+scope.actions);
    } else if (scope.args[0] == 'version' && !scope.args[1] || scope.args[0] == 'v' && !scope.args[1]) {
      return done('Usage: sails generate sv version new')
    }

    if (!scope.rootPath) {
      return done(INVALID_SCOPE_VARIABLE('rootPath'));
    }

    if (!isValidRoot(scope.rootPath)) {
      return done(INVALID_ROOT_PATH());
    }

    if (!isValidName(scope.args[1])) {
      return done(INVALID_NAME());
    }

    // Inicial Validation actions
    /**
     *
     */
    var actions = scope.actions;
    var invalidActions = [];
    actions = _.map(actions, function (action) {
      // Validate action names
      // (this is by no means complete, just a quick pass in the interest of being helpful)
      var invalid = action.match(/[^a-zA-Z0-9_\$]+/);

      // Handle errors
      if (invalid) {
        return invalidActions.push('Invalid actions notation: "' + actions + '"');
      }
      return action;
    });

    // Handle invalid action arguments
    // Send back invalidActions
    if (invalidActions.length) {
      return done.invalid(invalidActions);
    }

    // Make suer there aren't duplicates
    if ((_.uniq(actions)).length !== actions.length) {
      return done.invalid('Duplicate actions not allowed!');
    }

    if (actions.length == 0) {
      scope.actions = 0;
      console.log(`API VERSION: ${process.env.API_VERSION}`);
    }
    // Fin Validation actions

    //Determine other default values based on the aviable scope
    _.defaults(scope, {
      actions: []
    });

    /**
     * Validate controller or model for generate
     */
    if (scope.args[0] == 'controller' || scope.args[0] == 'c') {
      scope.generateTemplate = 1;
      scope.generateTarget = 'controller';
    } else if ((scope.args[0] == 'version' || scope.args[0] == 'v') && scope.args[1] == 'init') {
      scope.generateTemplate = 2
      scope.generateTarget = 'version'
    } else if ((scope.args[0] == 'version' || scope.args[0] == 'v') && scope.args[1] == 'major') {
      scope.generateTemplate = 3
      scope.generateTarget = 'version'
    } else if ((scope.args[0] == 'version' || scope.args[0] == 'v') && scope.args[1] == 'minor') {
      scope.generateTemplate = 4
      scope.generateTarget = 'version'
    }

    scope.actionFns = scope.actionFns || _.map(scope.actions, function (action) {
      return _.trimRight(
        EMBEDDED_ACTION_TEMPLATE_FN({
          actionsName: action,
          generateTemplate: scope.generateTemplate
        })
      );
    }),
      info(`It has been created ${scope.generateTarget}`)

    switch (scope.generateTemplate) {
      case 1:
        var capitalizedName = capitalize(scope.args[1]);
        scope.controllerName = capitalizedName + 'Controller';
        // Pluralize item
        scope.modelName = pluralize(capitalizedName);

        if (doesControllerExist(scope.rootPath, scope.controllerName)) {
          return done(ALREADY_EXISTS(scope.controllerName));
        }

        deleteVersionerFile(scope.rootPath)

        scope.filename = '/api/controllers/v' + process.env.API_VERSION + '/' + scope.controllerName + '.js'
        scope.version = '.versioner'
        info(`With the following actions: ${scope.actions}`)
        break
      case 2:

        if (doesVersionFilesExist(scope.rootPath)) {
          deleteOldFiles(scope.rootPath)
        }

        createNewVersion(scope.rootPath)

        scope.apiVer = '0.0'
        scope.port = 1337
        scope.mainDBA = '"sails-mongo"'
        scope.mainDBH = '"localhost"'
        scope.mainDBP = '"27017"'
        scope.mainDBU = 'username'
        scope.mainDBD = '"dbName"'
        scope.mainTK = '"token_api"'
        scope.redisP = 6379
        scope.redisH = '"localhost"'
        scope.redisD = 1
        scope.domain = '"https://app.domain.com"'
        scope.domaAP = `"https://api.domain.com/v${version}/"`

        scope.version = '.env'
        scope.filename = '.versioner'
        break
      case 3:
        createNewVersion(scope.rootPath, 'major')

        API_DOMAIN = API_DOMAIN.replace(`v${process.env.API_VERSION}`, `v${version}`)

        scope.apiVer = version
				scope.port = process.env.PORT
        scope.mainDBA = `"${process.env.MAIN_DB_ADAPTER}"`
        scope.mainDBH = `"${process.env.MAIN_DB_HOST}"`
        scope.mainDBP = `"${process.env.MAIN_DB_PORT}"`
        scope.mainDBU = `"${process.env.MAIN_DB_USER}"`
        scope.mainDBD = `"${process.env.MAIN_DB_DB}"`
        scope.mainTK = `"${process.env.TOKEN_KEY}"`
        scope.redisP = process.env.REDIS_PORT
        scope.redisH = `"${process.env.REDIS_HOST}"`
        scope.redisD = process.env.REDIS_DB
        scope.domain = `"${process.env.DOMAIN_APP}"`
        scope.domaAP = `"${API_DOMAIN}"`

        scope.version = '.env'
        scope.filename = '.versioner'
        break
      case 4:
        createNewVersion(scope.rootPath, 'minor')

        API_DOMAIN = API_DOMAIN.replace(`v${process.env.API_VERSION}`, `v${version}`)

        scope.apiVer = version
        scope.port = process.env.PORT
        scope.mainDBA = `"${process.env.MAIN_DB_ADAPTER}"`
        scope.mainDBH = `"${process.env.MAIN_DB_HOST}"`
        scope.mainDBP = `"${process.env.MAIN_DB_PORT}"`
        scope.mainDBD = `"${process.env.MAIN_DB_DB}"`
        scope.mainTK = `"${process.env.TOKEN_KEY}"`
        scope.redisP = process.env.REDIS_PORT
        scope.redisH = `"${process.env.REDIS_HOST}"`
        scope.redisD = process.env.REDIS_DB
        scope.domain = `"${process.env.DOMAIN_APP}"`
        scope.domaAP = `"${API_DOMAIN}"`

        scope.version = '.env'
        scope.filename = '.versioner'
        break
    }
    // Finalice Validation to generate

    //scope.actionFnss = _.truncate(scope.actionFns, { 'separator': /,? +/ });
    // When finished, trigger the `done` callback to begin generating
    // files/folders as specified by the `targets` below.
    //
    // > Or call `done()` with an Error for first argument to signify a fatal error
    // > and halt generation of all targets.
    return done();
  },



  /**
   * The files/folders to generate.
   * @type {Object}
   */
  targets: {

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // • e.g. create a folder:
    // ```
    // './hey_look_a_folder': { folder: {} }
    // ```
    //
    // • e.g. create a dynamically-named file relative to `scope.rootPath`
    // (defined by the `filename` scope variable).
    //
    // The `template` helper reads the specified template, making the
    // entire scope available to it (uses underscore/JST/ejs syntax).
    // Then the file is copied into the specified destination (on the left).
    // ```
    // './:filename': { template: 'example.template.js' },
    // ```
    //
    // • See https://sailsjs.com/docs/concepts/extending-sails/generators for more documentation.
    // (Or visit https://sailsjs.com/support and talk to a maintainer of a core or community generator.)
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    './:filename': { template: 'sv-template.template' },
    './:version': { template: 'env-template.template' }
  },


  /**
   * The absolute path to the `templates` for this generator
   * (for use with the `template` and `copy` builtins)
   *
   * @type {String}
   */
  templatesDirectory: TEMPLATES_PATH//path.resolve(__dirname, './templates')

};

function INVALID_ROOT_PATH() {
  var message = 'Sorry, this command can only be used in the root directory of a Sails project.';
  return message;
}

function INVALID_NAME() {
  var message = 'Sorry, you can only generate controller names that are alphabetic.';
  return message;
}

function ALREADY_EXISTS(cn) {
  return `A controller of the name ${cn} already exists at /api/controllers/v${process.env.API_VERSION}`
}

function isValidRoot(rootPath) {
  var rootFiles = fs.readdirSync(rootPath);
  var rootExists = ['package.json', 'app.js', '.sailsrc', 'config', 'api'];
  return rootExists.every(function (mustExist) {
    return rootFiles.indexOf(mustExist) !== -1;
  });
}

function checkMissingDefinitions(rootPath) {
  var rootFiles = fs.readdirSync(rootPath);
  var typingsExists = rootFiles.indexOf('typings') !== -1;

  if (!typingsExists) {
    warn('You may be missing type definitions that can be managed by tsd.');
    console.log();
    info('You can install the TypeScript Definition manager with the command: ');
    console.log('          npm install tsd -g');
    console.log();
    return;
  }
  var typingFiles = fs.readdirSync(path.join(rootPath, 'typings'));
  if (typingFiles.indexOf('express') === -1) {
    warn('You may be missing type definitions for express, which sails controllers use.');
    console.log();
  }

  if (typingFiles.indexOf('tsd.d.ts') === -1) {
    warn('You may be missing the consolidated type definition file generated by the TypeScript Definition manager.');
    console.log();
    warn('If you are managing type definitions using tsd, please make sure that the file tsd.d.ts exists under the typings folder.');
    console.log();
  }
}

function warn(message) {
  process.stdout.write('warn: '.yellow);
  console.log(message);
}
function info(message) {
  process.stdout.write('info: '.blue);
  console.log(message);
}

var alphabetOnly = new RegExp('[^A-Za-z]');
function isValidName(name) {
  return !alphabetOnly.exec(name);
}

function doesControllerExist(rootPath, controllerName) {
  var rootFiles = fs.readdirSync(rootPath);
  if (rootFiles.indexOf('api') !== -1) {
    var apiFiles = fs.readdirSync(path.join(rootPath, 'api'))
    if (apiFiles.indexOf('controllers') !== -1) {
      var controllerFiles = fs.readdirSync(path.join(rootPath, 'api', 'controllers'))
      if (controllerFiles.indexOf(`v${process.env.API_VERSION}`) !== -1) {
        var versionControllerFiles = fs.readdirSync(path.join(rootPath, 'api', 'controllers', 'v'+process.env.API_VERSION))
        return versionControllerFiles.indexOf(controllerName + '.js') !== -1
      }
    }
  }

  return false;
}

function doesVersionFilesExist(rootPath) {
  return (fs.readdirSync(rootPath).indexOf('.versioner') !== -1 && fs.readdirSync(rootPath).indexOf('.envs') !== -1) ? true:false
}

function createNewVersion(rootPath, type) {
  var rootFiles = fs.readdirSync(rootPath)
  if (rootFiles.indexOf('api') !== -1) {
    var apiFiles = fs.readdirSync(path.join(rootPath, 'api'))
    if (apiFiles.indexOf('controllers') !== -1) {
      var controllerFiles = fs.readdirSync(path.join(rootPath, 'api', 'controllers'))
      if (controllerFiles.indexOf(`v${process.env.API_VERSION}`) !== -1) {
        version = process.env.API_VERSION
        let major = version.toString().split('.')[0]
        let minor = version.toString().split('.')[1]
        switch (type) {
          case 'major':
            fse.remove(`${rootPath}/.env`)
            fse.remove(`${rootPath}/.versioner`)
            major++
            version = `${major}.${minor}`
            fse.copy(path.join(rootPath, 'api', 'controllers', `v${process.env.API_VERSION}`), path.join(rootPath, 'api', 'controllers', `v${version}`));
            break
          case 'minor':
            fse.remove(`${rootPath}/.env`)
            fse.remove(`${rootPath}/.versioner`)
            minor++
            version = `${major}.${minor}`
            fs.rename(path.join(rootPath, 'api', 'controllers', `v${process.env.API_VERSION}`), path.join(rootPath, 'api', 'controllers', `v${version}`));
            break

          default:
            break;
        }
      } else {
        version = '0.0'
        console.log(process.env.PRUEBA)
        //console.log(controllerFiles.indexOf(`v${process.env.API_VERSION}`))
        fs.mkdirSync(path.join(rootPath, 'api', 'controllers', `v${version}`))
      }
    }
  }
}

function deleteOldFiles(rootPath) {
  fse.remove(`${rootPath}/.envs`)
  fse.remove(`${rootPath}/.versioner`)
}

function deleteVersionerFile(rootPath) {
  fse.remove(`${rootPath}/.versioner`)
}

function capitalize(name) {
  return name[0].toUpperCase() + name.substring(1).toLowerCase();
}
