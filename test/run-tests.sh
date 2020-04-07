#!/bin/sh

srcsub=src/sub1/sub2
distsub=dist/sub1/sub2

die() {
  echo $1
  exit 1
}

rm -rf src dist

mkdir -p $srcsub
mkdir -p $distsub

touch src/{one.ts,three.ts,whatever.blah}
touch $srcsub/five.ts

touch dist/{one.js,one.js.map,two.js,two.js.map}
touch $distsub/{five.js,six.js.map,something.blah}

../bin/ts-purify

[ -f $distsub/six.js.map ] && die "failed to delete subdirectory file"
[ -f dist/two.js ] && die "failed to delete root file"

../bin/ts-purify -w &
rm src/one.ts
rm $srcsub/five.ts

sleep 1
kill %1

[ -f dist/one.js ] && die "failed to delete root file after watch"
[ -f dist/one.js.map ] && die "failed to delete root file after watch"
[ -f $distsub/five.js ] && die "failed to delete subdir file after watch"

echo tests passed
exit 0
