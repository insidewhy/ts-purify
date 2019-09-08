# ts-purify

Ensure files corresponding to typescript files are deleted when the corresponding source file is.

```bash
% ts-purify -s src -d lib
```

This will recursively delete all `js` and `js.map` files in `lib` that do not have a corresponding `ts` file in `src`.

```bash
% ts-purify -s src -d lib -w
```

This does the same as the above command, then uses `watchman` to scan `src` for deleted `ts` files, and when it finds one it will remove the corresponding `js` and `js.map` files from `lib`.

The `-v` or `--verbose` option can be used to log deleted files.
