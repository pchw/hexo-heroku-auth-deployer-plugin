// Generated by CoffeeScript 1.10.0
(function() {
  var async, colors, config, file, fs, path, spawn;

  async = require("async");

  fs = require("graceful-fs");

  path = require("path");

  colors = require("colors");

  spawn = require("child_process").spawn;

  file = require("hexo-fs");

  config = hexo.config.deploy;

  hexo.extend.deployer.register('heroku-auth', function(args, callback) {
    var baseDir, help, run, url;
    if (!config.repo && !config.repository) {
      help = ["You should configure deployment settings in _config.yml first!", "", "Example:", "  deploy:", "    type: heroku-auth", "    repo: <repository url>", "    message: [message]", "", "For more help, you can check the docs: " + "http://hexo.io/docs/deployment.html".underline];
      console.log(help.join("\n"));
      return callback();
    }
    url = config.repo || config.repository;
    baseDir = hexo.base_dir;
    run = function(command, args, callback) {
      var cp;
      cp = spawn(command, args, {
        cwd: baseDir
      });
      cp.stdout.on("data", function(data) {
        return process.stdout.write(data);
      });
      cp.stderr.on("data", function(data) {
        return process.stderr.write(data);
      });
      return cp.on("close", callback);
    };
    return async.series([
      function(next) {
        var files;
        files = ["app.js", "Procfile"];
        return async.each(files, (function(item, next) {
          var dest, src;
          src = path.join(__dirname, item);
          dest = path.join(baseDir, item);
          return fs.exists(dest, function(exist) {
            if (exist) {
              return next();
            } else {
              hexo.log.d("Copying %s...", item);
              return file.copyFile(src, dest, next);
            }
          });
        }), next);
      }, function(next) {
        var ignorePath, ignores;
        ignorePath = path.join(baseDir, ".gitignore");
        ignores = [".DS_Store", "Thumbs.db", "db.json", "debug.log", "node_modules/", ".deploy/"];
        console.log(ignorePath);
        return file.writeFile(ignorePath, ignores.join('\n'), next);
      }, function(next) {
        var defaultPackage, packagePath;
        packagePath = path.join(baseDir, "package.json");
        defaultPackage = JSON.stringify({
          name: "hexo",
          version: hexo.version,
          "private": true,
          dependencies: {
            connect: "2.x"
          }
        }, "  ");
        return fs.exists(packagePath, function(exist) {
          var content, e, error;
          if (exist) {
            try {
              content = require(packagePath);
              if (content.dependencies) {
                if (content.dependencies.connect) {
                  return next();
                } else {
                  content.dependencies.connect = "2.x";
                }
              } else {
                content.dependencies = {
                  connect: "2.x"
                };
              }
              hexo.log.d("Updating package.json...");
              return file.writeFile(packagePath, JSON.stringify(content, "  "), next);
            } catch (error) {
              e = error;
              hexo.log.d("Creating package.json...");
              return file.writeFile(packagePath, defaultPackage, next);
            }
          } else {
            hexo.log.d("Creating package.json...");
            return file.writeFile(packagePath, defaultPackage, next);
          }
        });
      }, function(next) {
        var gitPath;
        gitPath = path.join(baseDir, ".git");
        return fs.exists(gitPath, function(exist) {
          var commands;
          if (exist) {
            return next();
          }
          commands = [["init"], ["remote", "add", "heroku", url]];
          hexo.log.d("Initializing git...");
          return async.eachSeries(commands, (function(item, next) {
            return run("git", item, function(code) {
              if (code === 0) {
                return next();
              }
            });
          }), next);
        });
      }, function(next) {
        var branch, commands;
        if (args.setup) {
          return callback();
        }
        branch = args.branch || config.branch || "master";
        commands = [["add", "-A", "."], ["commit", "-m", "Site updated"], ["push", "-u", url, branch + ":master", "--force"]];
        return async.eachSeries(commands, (function(item, next) {
          return run("git", item, function() {
            return next();
          });
        }), next);
      }
    ], callback);
  });

}).call(this);
