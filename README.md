# journalview

A web-based viewer for [Day One](http://dayoneapp.com/) journals with an emphasis on power features.

![Search view](http://i.imgur.com/SH72ChX.png)
![Entry view](http://i.imgur.com/4wQSMbv.png)

Note: This version works (and I use it daily!) but it's still very rough around the edges.

## Features

- Two-pane view (easier browsing)
- Really fast hover navigation
- Really fast search

## Setup

1. Run `./setup`
2. Run `./run`, then go to [http://localhost:9000](http://localhost:9000)!

## Goals/TODO

- Keyboard navigation to move through entries quickly.
- Hover previews (linked entries, hash tags, etc.)
- Full page views for hashtags, other means of organization
- Calendar view

### Manual setup (just in case)

1. Install [Homebrew](http://brew.sh/): `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
2. Install [ElasticSearch](https://github.com/elastic/elasticsearch): `brew install elasticsearch`
3. Install gems:
```
  sudo gem install bundler
  bundle install
```

`bundle exec ruby main.rb` to run.