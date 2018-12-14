# Sails Versioner

A `SV` generator for use with the Sails command-line interface.


## Installation

```sh
$ npm i -s sails-versioner
```

Then merge the following into your `.sailsrc` file:

```json
{
  "generators": {
    "modules": {
      "sv": "sails-versioner"
    }
  }
}
```

> Note that instead of `"sails-versioner"`, you can also choose to provide the path to the generator locally (e.g. "./generators/sv").
> This is useful if, for example, you have specific best practices for particular projects or teams within your organization, and you want to be able to check in generators to your code repository.
>
> Certain generators are installed by default in Sails, but they can be overridden.  Other generators add support for generating entirely new kinds of things.
> Check out [Concepts > Extending Sails > Generators](https://sailsjs.com/docs/concepts/extending-sails/generators) for information on installing generator overrides / custom generators and information on building your own generators.


## Usage

#### Generate Controller

```bash
$ sails generate sv controller [name] [actions]
```

#### Version INIT

```bash
$ sails generate sv version init
```

#### Version Update

```bash
$ sails generate sv version [major or minor]
```

## WIP
> The generator of the model is still in development so it is recommended to only use the controller generator

## Bugs &nbsp; [![NPM version](https://badge.fury.io/js/@sebas/sails-verisoner.svg)](http://npmjs.com/package/sails-versioner)

To report a bug, [click here](sebastianvalencia@isoul.site).


## Contributing

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](https://sailsjs.com/documentation/contributing) when opening issues or submitting pull requests.

[![NPM](https://nodei.co/npm/sails-versioner.png?downloads=true)](http://npmjs.com/package/sails-versioner)



## License

This cts generator is available under the **MIT license**.

The [Sails framework](https://sailsjs.com) is free and open-source under the [MIT License](https://sailsjs.com/license).


![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

## Log Version

### v0.1.1
- FIX .env Template

### v0.1.0
- Version updater major and minor
- Controller generate from actuality version

