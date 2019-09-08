#!/bin/sh

srcsub=src/sub1/sub2
libsub=lib/sub1/sub2

die() {
  echo $1
  exit 1
}

rm -rf src lib

mkdir -p $srcsub
mkdir -p $libsub

touch src/{one.ts,three.ts,whatever.blah}
touch $srcsub/five.ts

touch lib/{one.js,one.js.map,two.js,two.js.map}
touch $libsub/{five.js,six.js.map,something.blah}

../bin/ts-purify

[ -f $libsub/six.js.map ] && die "failed to delete subdirectory file"
[ -f lib/two.js ] && die "failed to delete root file"

../bin/ts-purify -w &
rm src/one.ts
rm $srcsub/five.ts

sleep 1
kill %1

[ -f lib/one.js ] && die "failed to delete root file after watch"
[ -f lib/one.js.map ] && die "failed to delete root file after watch"
[ -f $libsub/five.js ] && die "failed to delete subdir file after watch"

echo tests passed
exit 0
