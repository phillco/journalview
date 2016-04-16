/** Make uncaught errors and console errors more obvious by replacing the DOM with them. */
(function () {
  function renderError(error, className) {
    try {
      var errorNode = document.createElement('div');
      errorNode.className = 'big-error ' + className;
      errorNode.innerText = error;
      document.body.innerHTML = "";
      document.body.appendChild(errorNode);
      document.body.className += ' has-error';
    } catch (e) {
    }
  }

  ['error', 'warn'].forEach(function (kind) {
    var _oldFunction = console[kind];
    console[kind] = function (arg) {
      renderError(arg, 'console-' + kind);
      _oldFunction.apply(this, arguments);
    }
  });

  window.onerror = function (e) {
    renderError(e, 'global-error');
  };

  // Make alert() more useful:
  var __nativeAlert = window.alert;
  window.alert = function (obj) {
    if (_.isObject(obj) || _.isArray(obj)) {
      __nativeAlert(JSON.stringify(obj));
    } else {
      __nativeAlert(obj);
    }
  }
})();

var ListViewEntry = React.createClass({
  onMouseOver: function () {
    this.props.onHover(this.props.UUID);
  },

  render: function () {
    return React.DOM.li({
        className: 'entries-list-item' + (this.props.isSticky ? ' sticky' : ''),
        onMouseOver: this.onMouseOver,
        onClick: this.props.onClick.bind(this, this.props.UUID),
      },
      React.DOM.a({href: '/html/entry/' + this.props.UUID}, this.props.Title));
  }
});

var SearchBox = React.createClass({
  componentDidMount: function () {
    setTimeout(function () { $('.entries-list-search-box').focus(); }, 0); // Fix later
  },
  render: function () {
    var self = this;
    return React.DOM.div(
      {className: 'entries-list-search-area'},
      "Search: ",
      React.DOM.input({
        className: 'entries-list-search-box',
        ref: 'field',
        onChange: function (e) {
          self.props.onSearch(self.refs.field.value)
        },
      })
    );
  }
});

var ListView = React.createClass({
  getInitialState: function () {
    return {entries: this.props.initialEntries, searchResults: null}
  },
  componentDidMount: function () {

  },
  render: function () {
    var self = this;
    var entries = this.state.entries;
    return React.DOM.div({className: 'entries'},
      React.createFactory(SearchBox)({
        onSearch: self.props.onSearch,
      }),
      React.DOM.div({className: 'scrollable entries-list'},
        Object.keys(entries).map(function (group) {
          return React.DOM.div({key: group},
            React.DOM.div({className: 'entries-list-group-header'}, group + ':'),
            React.DOM.ul({className: 'entries-list-ul'},
              entries[group].map(function (entry) {
                return React.createFactory(ListViewEntry)(Object.assign(entry, {
                  key: entry.UUID,
                  isSticky: entry.UUID == self.props.stickyEntryId,
                  onHover: self.props.onEntryHover,
                  onClick: self.props.onEntryClick,
                }));
              })
            )
          );
        })
      )
    )
      ;
  }
});

var Viewer = React.createClass({
  getInitialState: function () {
    return {related: null};
  },
  fetchRelatedEntries: function () {
    var self = this;
    $.getJSON('/similar-to/' + this.props.UUID, function (data) {
      self.setState({related: data});
    });
  },
  componentDidMount: function () {
    this.fetchRelatedEntries();
  },
  componentWillReceiveProps: function () {
    this.fetchRelatedEntries();
  },
  render: function () {
    if (!this.props.Title) {
      return React.DOM.div();
    }
    var self = this;
    var date = new Date(this.props['Creation Date']);
    return React.DOM.div(null,
      React.DOM.div({className: 'post-info'},
        React.DOM.h1({className: 'post-info-title'}, this.props.Title),
        React.DOM.div({className: 'post-info-date'},
          date.toLocaleDateString() + ' ' + date.toLocaleTimeString())
      ),
      React.DOM.div({dangerouslySetInnerHTML: {__html: this.props.HTML}}),
      this.state.related ?
        React.DOM.div({className: 'related-entries'},
          React.DOM.h1({}, "Related Entries"),
          React.DOM.ul({},
            (this.state.related || []).map(function (related) {
              return React.DOM.li({key: related._source.UUID},
                React.DOM.a({
                  href: '/html/entry/' + related._source.UUID,
                  onClick: self.props.onEntryClick.bind(this, related._source.UUID)
                }, related._source.Title),
                React.DOM.div({}, related._source['Entry Text'].substring(0, 200) + '...'))
            }))
        ) : null
    );
  }
});

var SearchResult = React.createClass({
  render: function () {
    return React.DOM.div({className: 'search-result'},
      React.DOM.a({
          className: 'search-result-title',
          href: '/html/entry/' + this.props._source['UUID'],
          onClick: this.props.onEntryClick.bind(this, this.props._source['UUID']),
        },
        this.props._source.Title, " ",
        new Date(this.props._source['Creation Date']).toLocaleDateString()),
      React.DOM.div({
        className: 'search-result-snippet',
        dangerouslySetInnerHTML: {__html: this.props.highlight["Entry Text"].join(' ')}
      })
    );
  }
});

var SearchResultsView = React.createClass({
  render: function () {
    var self = this;
    return React.DOM.div({}, this.props.results.length + " results:",
      this.props.results.map(function (result) {
        return React.createFactory(SearchResult)(Object.assign(result, {
          key: result._source.UUID,
          onEntryClick: self.props.onEntryClick,
        }));
      })
    );
  }
});

var App = React.createClass({
  getInitialState: function () {
    return {searchResults: null, currentlyViewingEntry: null, stickyEntryId: null};
  },
  componentDidMount: function () {
    var hash = getHashAsObject();
    var self = this;
    if (hash.id) {
      self.fetch(hash.id, true, true);
    }
    if (hash.q) {
      $.getJSON('/entries', {q: hash.q}, function (data) {
        self.setState({searchResults: data});
      });
    }
  },
  fetch: function (id, setSticky, scroll, cb) {
    var self = this;
    $.getJSON('/entry/' + id, {}, function (data) {
      setHashObject({id: id});
      self.setState({currentlyViewingEntry: data});
      if (setSticky) {
        self.setState({stickyEntryId: id});
        if (scroll) {
          $('.entries .scrollable').scrollTop($('.entries-list-item.sticky').position().top - 60); // Fix jQuery
        }
      }
      if (cb) {
        cb();
      }
    });
  },
  render: function () {
    var self = this;

    if (this.state.searchResults) {
      var searchResultsView = React.createFactory(SearchResultsView)({
        results: this.state.searchResults,
        onEntryClick: function (id, e) {
          self.fetch(id, true /* sticky */, true /* scroll */, function () {
            // Null out the search
            setHashObject({q: null});
            self.setState({searchResults: null});
          });
        }
      });
    } else if (this.state.currentlyViewingEntry) {
      var viewer = React.createFactory(Viewer)(Object.assign(this.state.currentlyViewingEntry, {
        onEntryClick: function (id, e) {
          self.fetch(id, true /* sticky */, true /* scroll */);
          e.preventDefault();
        }
      }));
    }

    var listView = React.createFactory(ListView)({
      initialEntries: this.props.initialEntries,
      stickyEntryId: self.state.stickyEntryId,
      onEntryHover: function (id) {
        if (!self.state.stickyEntryId) {
          self.fetch(id, false);
        }
      },
      onEntryClick: function (id, e) {
        if (self.state.stickyEntryId == id) {
          self.setState({stickyEntryId: null, searchResults: null});
        } else {
          self.setState({stickyEntryId: id, searchResults: null});
          self.fetch(id, true);
        }
        e.preventDefault();
      },
      onSearch: function (text, e) {
        $.getJSON('/entries', {q: text}, function (data) {
          self.setState({searchResults: data});
          setHashObject({q: text});
        });
      }
    });

    return React.DOM.div({}, listView,
      React.DOM.div({className: 'scrollable viewer'}, viewer, searchResultsView));
  }
});

function getHashAsObject() {
  return document.location.hash ? JSON.parse(document.location.hash.substring(1)) : {};
}

function setHashObject(obj) {
  document.location.hash = JSON.stringify(Object.assign(getHashAsObject(), obj));
}

$(function () {
  $.getJSON('/entries', {}, function (response) {
    ReactDOM.render(
      React.createFactory(App)({initialEntries: response}),
      document.getElementById('container'),
      function () {
        $.post('/memoize-html', {html: $('#container').html()});
      }
    );
  });
});
