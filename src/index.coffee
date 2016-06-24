async = require("async")
fs = require("graceful-fs")
path = require("path")
colors = require("colors")
spawn = require("child_process").spawn
file = require("hexo-fs")
config = hexo.config.deploy

hexo.extend.deployer.register 'heroku-auth', (args, callback) ->
  if not config.repo and not config.repository
    help = [
      "You should configure deployment settings in _config.yml first!"
      ""
      "Example:"
      "  deploy:"
      "    type: heroku-auth"
      "    repo: <repository url>"
      "    message: [message]"
      ""
      "For more help, you can check the docs: " + "http://hexo.io/docs/deployment.html".underline
    ]
    console.log help.join("\n")
    return do callback
  url = config.repo or config.repository
  baseDir = hexo.base_dir
  run = (command, args, callback) ->
    cp = spawn(command, args,
      cwd: baseDir
    )
    cp.stdout.on "data", (data) ->
      process.stdout.write data

    cp.stderr.on "data", (data) ->
      process.stderr.write data

    cp.on "close", callback

  async.series [
    (next) ->
      files = [
        "app.js"
        "Procfile"
      ]
      async.each files, ((item, next) ->
        src = path.join(__dirname, item)
        dest = path.join(baseDir, item)
        fs.exists dest, (exist) ->
          if exist
            next()
          else
            hexo.log.d "Copying %s...", item
            file.copyFile src, dest, next

      ), next
    (next) ->
      ignorePath = path.join(baseDir, ".gitignore")
      ignores = [
        ".DS_Store"
        "Thumbs.db"
        "db.json"
        "debug.log"
        "node_modules/"
        ".deploy/"
      ]
      console.log ignorePath
      file.writeFile ignorePath, ignores.join('\n'), next
    (next) ->
      packagePath = path.join(baseDir, "package.json")
      defaultPackage = JSON.stringify(
        name: "hexo"
        version: hexo.version
        private: true
        dependencies:
          connect: "2.x"
      , "  ")
      fs.exists packagePath, (exist) ->
        if exist
          try
            content = require(packagePath)
            if content.dependencies
              if content.dependencies.connect
                return next()
              else
                content.dependencies.connect = "2.x"
            else
              content.dependencies = connect: "2.x"
            hexo.log.d "Updating package.json..."
            file.writeFile packagePath, JSON.stringify(content, "  "), next
          catch e
            hexo.log.d "Creating package.json..."
            file.writeFile packagePath, defaultPackage, next
        else
          hexo.log.d "Creating package.json..."
          file.writeFile packagePath, defaultPackage, next

    (next) ->
      gitPath = path.join(baseDir, ".git")
      fs.exists gitPath, (exist) ->
        return next()  if exist
        commands = [
          ["init"]
          [
            "remote"
            "add"
            "heroku"
            url
          ]
        ]
        hexo.log.d "Initializing git..."
        async.eachSeries commands, ((item, next) ->
          run "git", item, (code) ->
            next()  if code is 0

        ), next

    (next) ->
      return callback()  if args.setup
      branch = args.branch or config.branch or "master"
      commands = [
        [
          "add"
          "-A"
          "."
        ]
        [
          "commit"
          "-m"
          "Site updated"
        ]
        [
          "push"
          "-u"
          url
          "#{branch}:master"
          "--force"
        ]
      ]
      async.eachSeries commands, ((item, next) ->
        run "git", item, ->
          next()

      ), next
  ], callback
