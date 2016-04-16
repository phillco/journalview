require 'plist'
require 'elasticsearch'

# Parses Day One entries.
class Parser

  def initialize(path)
    @path = path
    @data = {}
    @client = Elasticsearch::Client.new(log: false)
    @index_thread = Thread.start {
      puts "[Parser] Index thread started"
      loop do
        Thread.stop # Parser will wake us up.
        wait_for_search_server
        start = Time.now
        @data.each { |entry|
          @client.index(index: 'journalview', type: 'entry', id: entry['UUID'], body: entry)
        }
        puts "Indexed #{@data.count} entries in #{((Time.now - start) * 1000).to_i}ms."
      end
    }
  end

  def parse_all!
    start = Time.now
    @data = entry_paths.map { |path| parse_entry(path) }.sort { |a, b| b['Creation Date'] <=> a['Creation Date'] }
    puts "Parsed #{@data.count} entries in #{((Time.now - start) * 1000).to_i}ms."
    @index_thread.wakeup
  end

  def entries
    @data
  end

  def find_by_uuid(uuid)
    @data.find { |entry| entry['UUID'] == uuid }
  end

  private

  def wait_for_search_server
    loop do
      begin
        @client.ping
        break
      rescue
        sleep 1
      end
    end
  end

  def entry_paths
    Dir.glob("#{File.join(@path, '/entries')}/*")
  end

  def parse_entry(path)
    base_entry = Plist::parse_xml(path) # Has keys like "Entry Text"
    first_line = base_entry['Entry Text'].split("\n")[0]
    if first_line
      if first_line.length > 60
        base_entry['Title'] = first_line[0..59] + '…'
      else
        base_entry['Title'] = first_line
        base_entry['Entry Text'] = base_entry['Entry Text'][first_line.length..-1]
      end
    else
      base_entry['Title'] = 'Untitled'
    end

    base_entry['Title'] = base_entry['Title'].gsub(/[#\*]/, '').strip
    base_entry
  end
end
