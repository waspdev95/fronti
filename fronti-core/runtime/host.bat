@echo off
set "NODE_BIN=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
"%NODE_BIN%" "%~dp0host.js" %*
