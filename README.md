# aurora-mutate-many-column-editor
Mutation that allows you to have a note with many columns. Add or subtract columns to your delight.

## How it works
Tell Aurora we're going to mutate `ContentView`:
```
module.exports.mutations = {
  ContentView: manyColumnContentView
};
```

With multiple columns, we will generally save our `editorState` and `content` like this:
```
editorState/content = {
  n_columns: 2,
  editors: [
    editorState1,
    editorState2
  ]
}
```
See `util.js` for the functions that `serialize`/`deSerialize` these states and generate an empty note of this type.

So in the `render` function, we check to see if the `note.mutationName` is our type.
If so, then we can render it. If not, we just return the original `ContentView` and let it handle this note.

To render the note, we loop through all the editors and display them with their states.
```
render() {
  if (this.props.note && this.props.note.mutationName === MUTATION_NAME) {
    const { onChange, isLoadingContent, ...props } = this.props;
    const Editor = api().Editor;
    const editors = this.props.ourEditorState.editors.map((col, index) => {
      if (index == 0) {
        return (
          <div className={"editor"} key={"editor-div" + index}>
            <Editor
              key={"editor" + index}
              editorState={col}
              onChange={editorState => {
                this.onSingleChange(editorState, index);
              }}
              placeholder={"Change me!"}
              isLoadingContent={isLoadingContent}
              finishedLoadingContent={this.finishedLoadingContent}
              {...props}
            />
          </div>
        );
      } else {
        return (
          <div
            className={"editor not-first-editor"}
            key={"editor-div" + index}>
            <Editor
              key={"editor" + index}
              editorState={col}
              onChange={editorState => {
                this.onSingleChange(editorState, index);
              }}
              placeholder={"Change me!"}
              {...props}
            />
          </div>
        );
      }
    });
    return <div className="editor-container">{editors}</div>;
  }
  return <ContentView {...this.props} />;
}
```
Make sure to extract props you want to consume.
We return a different component props for `index === 0` because the first editor
has different css styles and additional props to be passed. This is because we only
should pass `isLoadingContent` and `this.finishedLoadingContent` to only one editor
so that they don't get called multiple times when content is loaded.

We use `api().Editor` to ensure we are using `BaseEditor` in our mutation. This will allow
Editor mutations to be layered into our mutation.

When one editor changes, we update the state of that editor:
```
onSingleChange = (state, index) => {
  const editorState = this.props.ourEditorState;
  editorState.editors[index] = state;
  this.onChange(editorState);
};
```

Our general `onChange` function serializes and does all that jazz and calls
the parent `props.onChange` to interact with Aurora.
```
onChange = (editorState, save) => {
  const serializedContent = serialize(editorState);
  const serializedPreview = serPreview(editorState);
  const searchableText = getSearchableText(editorState);

  this.props.onChange(
    editorState,
    serializedContent,
    serializedPreview,
    searchableText,
    save
  );
};
```

Make sure you handle loading content with your `deSerialize` function:
```
finishedLoadingContent = () => {
  this.props.note.getContent().then(content => {
    const editorState = deSerialize(content[this.props.note.mutationName]);
    this.props.onContentLoaded(editorState);
  });
};
```

To add our toolbar add/remove column buttons, we do:
```
window.toolbar.buttons.push({
  icon: "➕",
  command: "add-column",
  hint: "Add a new column to note",
  noteType: MUTATION_NAME
});
window.toolbar.buttons.push({
  icon: "➖",
  command: "remove-column",
  hint: "Remove right-most column in note",
  noteType: MUTATION_NAME
});
```
`noteType` defines that these buttons should only appear in the toolbar if a note of
that type is selected. This is how we ensure these buttons don't appear for other note types.

We then gotta handle when these toolbar buttons are pressed:
```
componentDidUpdate(prevProps) {
  ...
  const simulatedKeyCommand =
    prevProps.simulatedKeyCommand === null &&
    this.props.simulatedKeyCommand !== null;
  if (simulatedKeyCommand) {
    this.handleSimulatedKeyCommand(
      this.props.simulatedKeyCommand,
      this.props.ourEditorState
    );
  }
}

handleSimulatedKeyCommand(command, editorState) {
  if (command === "add-column") {
    addColumn(editorState);
    this.onChange(editorState, true);
  } else if (command === "remove-column") {
    if (removeColumn(editorState)) {
      this.onChange(editorState, true);
    }
  }
}
```
When calling `this.onChange` we make the second parameter `true`, which indicates
that these changes should be automatically saved. This is important; otherwise these changes
won't be persisted unless a user starts typing in the note.

Finally, don't forget to register the note type:
```
// Add this two column editor to global registry
window.editors.ManyColumnEditor = {
  emptyEditorState: emptyState(),
  newNoteContent: emptySerializedState(),
  screenName: "Many Column Note"
};
```
