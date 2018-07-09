/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

const {spawnAsync} = require('../utils.js');
const path = require('path');
const fs = require('fs-extra');

const gitPull = async (cwd) => spawnAsync('git', ['pull'], {cwd});
const npmInstall = async (cwd) => spawnAsync('npm', ['install'], {cwd});

const getNonSymlinks = (root, filenames) => Promise.all(
  filenames.map(f => path.resolve(root, f))
    .map(p => fs.lstat(p).then(stat => ({stat, p})))
)
  .then(list => list.filter(({stat}) => stat.isDirectory() && !stat.isSymbolicLink()))
  .then(list => list.map(({p}) => p));

const getGitPackages = list => Promise.all(
  list.map(filename => fs.exists(path.join(filename, '.git')).then(exists => {
    return ({filename, exists});
  }))
)
  .then(list => list.filter(p => p.exists))
  .then(list => list.map(p => p.filename));

const upgrade = dir => gitPull(dir)
  .then(() => npmInstall(dir));

module.exports = ({logger, options, args}) => {
  const pp = path.resolve(options.root, 'src', 'packages');

  return fs.readdir(pp)
    .then(filenames => getNonSymlinks(pp, filenames))
    .then(filenames => getGitPackages(filenames))
    .then(filenames => Promise.all(filenames.map(f => {
      logger.await('Upgrading package in', f);
      return upgrade(f);
    })));
};
