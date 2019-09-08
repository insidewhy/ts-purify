#!/bin/sh

srcsub=src/sub1/sub2
libsub=lib/sub1/sub2

rm -rf src lib

mkdir -p $srcsub
mkdir -p $libsub

touch src/{one.ts,three.ts,whatever.blah}
touch $srcsub/five.ts

touch lib/{one.js,one.js.map,two.js,two.js.map}
touch $libsub/{five.js,six.js.map,something.blah}

../bin/ts-purify -w -v
