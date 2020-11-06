import _fs_ from 'fs';
import _path_ from 'path';

const _0777 = parseInt('0777', 8);

/**
 * No Operation, just pass the input to the output
 * @param input
 */
function noop<T>(input: T): T { return input; }

/**
 * mkdir full path
 * @param path 
 * @param opts 
 * @param callback 
 * @param made 
 */
export function mkdirP(path: string, opts: any, callback: (...args: any[]) => void, made?: string | null) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  } else if (!opts || typeof opts !== 'object') {
    opts = { mode: opts };
  }

  let mode = opts.mode;
  const xfs = opts.fs || _fs_;

  if (mode === undefined) {
    /* tslint:disable:no-bitwise */
    mode = _0777 & ~process.umask();
    /* tslint:enable:no-bitwise */
  }
  if (!made) made = null;

  const cb = callback || noop;
  path = _path_.resolve(path);

  xfs.mkdir(path, mode, (er: NodeJS.ErrnoException | null) => {
    if (!er) {
      made = made || path;
      return cb(null, made);
    }
    switch (er.code) {
      case 'ENOENT':
        enoent(path, opts, cb);
        break;

      default:
        skipIfDirectoryExists(xfs, path, cb, er, made);
        break;
    }
  });
}

/**
 * In the case of any other error, just see if there's a dir there already.
 * If so, then hooray!
 * If not, then something is borked.
 * @param xfs 
 * @param path 
 * @param fn 
 * @param originalError 
 * @param made 
 */
function skipIfDirectoryExists(xfs: any, path: string, fn: (...args: any[]) => void, originalError: NodeJS.ErrnoException, made: string | null | undefined) {
  xfs.stat(path, (er2: NodeJS.ErrnoException | null, stat: _fs_.BigIntStats) => {
    if (er2 || !stat.isDirectory())
      fn(originalError, made);
    else
      fn(null, made);
  });
}

/**
 * 
 * @param path 
 * @param opts 
 * @param callback 
 */
function enoent(path: string, opts: any, callback: (...args: any[]) => void) {
  mkdirP(_path_.dirname(path), opts, (er: NodeJS.ErrnoException | null, made: string | null) => {
    if (er)
      callback(er, made);
    else
      mkdirP(path, opts, callback, made);
  });
}

/**
 * Synchronous mkdir(2) - create a directory full path.
 * @param p 
 * @param opts 
 * @param made 
 */
export function sync(p: string, opts?: any, made?: string | null): string | null {
  if (!opts || typeof opts !== 'object') {
    opts = { mode: opts };
  }

  let mode = opts.mode;
  const xfs = opts.fs || _fs_;

  if (mode === undefined) {
    /* tslint:disable:no-bitwise */
    mode = _0777 & ~process.umask();
    /* tslint:enable:no-bitwise */
  }
  if (!made) made = null;

  p = _path_.resolve(p);

  try {
    xfs.mkdirSync(p, mode);
    made = made || p;
  } catch (err0) {
    switch (err0.code) {
      case 'ENOENT':
        made = sync(_path_.dirname(p), opts, made);
        sync(p, opts, made);
        break;

      // In the case of any other error, just see if there's a dir
      // there already.  If so, then hooray!  If not, then something
      // is borked.
      default:
        let stat;
        try {
          stat = xfs.statSync(p);
        } catch (err1) {
          throw err0;
        }
        if (!stat.isDirectory()) throw err0;
        break;
    }
  }

  return made;
}
