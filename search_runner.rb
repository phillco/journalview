require 'open3'
require 'fileutils'
require 'shellwords'

class SearchRunner
  def initialize(journal_path)
    @pid = nil
    @search_index_path = File.join(journal_path, '/.search_index')
  end

  def start!
    clear!
    FileUtils::mkdir_p(@search_index_path)
    Thread.new do
      Open3.popen2e({'ES_HEAP_SIZE' => '100m'},
                    'elasticsearch',
                    "--path.data=#{Shellwords.shellescape(@search_index_path)}") do |stdin, stdout_stderr, wait_thread|
        @wait_thread = wait_thread
        @pid = wait_thread.pid
        stdout_stderr.each { |line| puts "[ElasticSearch] #{line}" }
      end
    end
  end

  def stop!
    Process.kill('INT', @pid) if @pid
  end

  def clear!
    FileUtils.rmdir(@search_index_path)
  end

  def wait_for
    @wait_thread.value
  end
end