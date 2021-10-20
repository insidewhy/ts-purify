#!/bin/bash

srcsub=src/sub1/sub2
distsub=dist/sub1/sub2

die() {
  echo $1
  exit 1
}

rm -rf src dist

mkdir -p $srcsub
mkdir -p $distsub

touch src/{one.tsx,three.ts,whatever.blah}
touch $srcsub/five.ts

touch dist/{one.js,one.js.map,two.js,two.js.map}
touch $distsub/{five.js,six.js.map,something.blah}

../bin/ts-purify

[ ! -f dist/one.js ] && die "should not have deleted dist/one.js"
[ ! -f $distsub/five.js ] && die "should not have deleted $distsub/five.js"
[ -f $distsub/six.js.map ] && die "failed to delete subdirectory file"
[ -f dist/two.js ] && die "failed to delete root file"

touch src/{one.tsx,two.ts}

touch dist/{one.js,one.js.map,two.js,two.js.map,ignore-me.js}

../bin/ts-purify --ignore-pattern dist/ignore-*.js

[ ! -f dist/ignore-me.js ] && die "deleted ignored file"

../bin/ts-purify -w &
rm src/one.tsx
rm $srcsub/five.ts

sleep 1
kill %1

[ -f dist/one.js ] && die "failed to delete root file after watch"
[ -f dist/one.js.map ] && die "failed to delete root file after watch"
[ -f $distsub/five.js ] && die "failed to delete subdir file after watch"

echo tests passed
exit 0
