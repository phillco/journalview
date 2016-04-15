class Setup
  DOTFILE_PATH = ENV['HOME'] + '/.journalview'

  def sanitized_path
    journal_path = saved_journal_path
    until validate_journal_path(journal_path) do
      print "Please enter the path to your Day One journal (e.g. ~/Documents/Day One.dayone):\n> "
      journal_path = gets.strip
    end

    puts "Using journal at #{journal_path}"
    File.write(DOTFILE_PATH, journal_path)
    validate_journal_path(journal_path)
  end

  private

  def saved_journal_path
    if File.exist? DOTFILE_PATH
      File.read(DOTFILE_PATH).strip
    end
  end

  def validate_journal_path(path)
    unless path
      return nil
    end

    path = File.expand_path(path) # Expand ~, remove trailing /
    unless path.end_with? '.dayone'
      puts "Error: The path given to your journal (#{path}) does not end with '.dayone'"
      return nil
    end

    # Day One journals contain an 'entries' folder.
    unless File.exist?(File.join(path, '/entries')) and File.directory?(File.join(path, '/entries'))
      puts "Error: The path given to your journal (#{path}) does not contain an 'entries' folder."
      return nil
    end

    path
  end

end