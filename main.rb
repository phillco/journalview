#!/usr/bin/env ruby -w
start = Time.now

require './setup'
require './search_runner'
require './parser'

journal_path = Setup.new.sanitized_path

require 'sinatra'
require 'json'
require 'redcarpet'
require 'elasticsearch'

Thread.abort_on_exception = true

search_runner = SearchRunner.new(journal_path)
search_runner.start!
parser = Parser.new(journal_path)
Thread.new {
  loop do
    parser.parse_all!
    sleep 60 # Reparse every sixty seconds
  end
}

Signal.trap('INT') {
  puts '...exiting, stopping search:'
  search_runner.stop!
  search_runner.wait_for
  search_runner.clear!
  puts '...done.'
}

@search_client = Elasticsearch::Client.new(log: false)

set :bind, 'localhost'
set :port, 9000

before do
  content_type :json, 'charset' => 'utf-8'
end

get '/' do
  content_type :html, 'charset' => 'utf-8'

  entries_by_month = parser.entries.group_by { |entry| "#{entry['Creation Date'].month}/#{entry['Creation Date'].year}" }
  cache_html = File.exists?('.html-cache') ? File.read('.html-cache') : ''
  erb :index, {}, {:entries => entries_by_month, :cache_html => cache_html}
end

# HTML routes:

get '/html/entry/:id' do
  content_type :html, 'charset' => 'utf-8'

  renderer = Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)
  entry = parser.find_by_uuid(params['id'])
  erb :entry, {}, {:entry => entry, :html => renderer.render(entry['Entry Text'])}
end

# JSON routes:

get '/entries' do
  if params['q']
    @search_client ||= Elasticsearch::Client.new(log: false)
    JSON::dump(@search_client.search(index: 'journalview', body: {
        query: {match_phrase_prefix: {'Entry Text': '*' + params['q'] + '*'}},
        highlight: {
            fields: {"Entry Text": {"fragment_size": 200}}
        }
    })['hits']['hits'])
  else
    entries = parser.entries.map { |e| e.select { |k, v| ['Creation Date', 'Title', 'UUID'].include?(k) } }
    entries_by_month = entries.group_by { |entry| "#{entry['Creation Date'].month}/#{entry['Creation Date'].year}" }
    JSON::dump(entries_by_month)
  end
end

get '/similar-to/:id' do
  @search_client ||= Elasticsearch::Client.new(log: false)
  JSON::dump(@search_client.search(index: 'journalview', body: {
      query: {
          more_like_this: {
              fields: ['Entry Text'],
              like: [_index: 'journalview', _type: 'entry', _id: params['id']]
          }
      }
  })['hits']['hits'])
end

get '/entry/:id' do
  entry = parser.find_by_uuid(params['id'])
  renderer = Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)

  start = Time.now
  entry['HTML'] = renderer.render(entry['Entry Text'])
  puts "Rendered HTML in #{((Time.now - start) * 1000).to_i}ms."
  JSON::dump(entry)
end

get '/all-entry-data' do
  parser.entries.to_json
end

post '/memoize-html' do
  File.write('.html-cache', params['html'])
  "OK"
end

puts "Server ready in #{((Time.now - start) * 1000).to_i}ms."