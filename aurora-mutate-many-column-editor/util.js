/**
 * A collection of utilities for working with Draft-js and editors in general
 */
import {
  EditorState,
  ContentState,
  convertToRaw,
  convertFromRaw
} from "draft-js";

// ------------------- copied stuff ------------------------
//
const MAX_PREVIEW_LENGTH = 40;

function formatText(text) {
  const newText = text ? text : "New Note";
  const formattedText =
    newText.length > MAX_PREVIEW_LENGTH
      ? newText.substring(0, MAX_PREVIEW_LENGTH - 3) + "..."
      : newText;
  return formattedText;
}

function serializePreview(editorState) {
  if (editorState === null) {
    return { text: "No preview" };
  }
  const text = editorState.getCurrentContent().getFirstBlock().text;
  return { text: formatText(text) };
}

/**
 * Serializes "content" of this editor so it can be saved.
 */
function serializeContent(editorState) {
  return {
    contentState: convertToRaw(editorState.getCurrentContent())
  };
}

/**
 * Returns an EditorState with the text already typed out for you!
 */
const editorStateFromText = text =>
  EditorState.createWithContent(ContentState.createFromText(text));

function emptyEditorState() {
  return EditorState.createEmpty();
}

const emptySerializedEditorState = () => {
  return serializeContent(emptyEditorState());
};

/**
 * Deserializes "content" of this editor so it can be loaded in.
 */
function deSerializeContent(content) {
  const contentState = convertFromRaw(content.contentState);
  let editorState = EditorState.createWithContent(contentState);
  // Note that the "moveSelectionToEnd" is required to fix errors
  // that put the cursor in the front instead of at the end when clicked on.
  editorState = EditorState.moveSelectionToEnd(
    EditorState.createWithContent(editorState.getCurrentContent())
  );
  return editorState;
}

// ----------------- non copied stuff ------------------------

export function deSerialize(content) {
  const deSerializedEditors = content.editors.map(e => deSerializeContent(e));
  return {
    n_columns: content.n_columns,
    editors: deSerializedEditors
  };
}

export function serialize(state) {
  const serializedEditors = state.editors.map(e => serializeContent(e));
  return {
    n_columns: state.n_columns,
    editors: serializedEditors
  };
}

export function serPreview(state) {
  return serializePreview(state.editors[0]);
}

function emptyState() {
  return {
    n_columns: 1,
    editors: [emptyEditorState()]
  };
}

export function addColumn(state) {
  state.n_columns += 1;
  state.editors.push(emptyEditorState());
}

function lastColumnHasText(state) {
  return (
    state.editors[state.editors.length - 1].getCurrentContent().getPlainText()
      .length > 0
  );
}

export function removeColumn(state) {
  if (state.n_columns > 1) {
    if (lastColumnHasText(state)) {
      if (
        !window.confirm(
          "Are you sure you want to delete the right-most column? You will lose any text in this column."
        )
      ) {
        return false;
      }
    }
    state.n_columns -= 1;
    state.editors.splice(-1, 1);
    return true;
  }
  return false;
}

function emptySerializedState() {
  return serialize(emptyState());
}

export function getSearchableText(state) {
  return state.editors.reduce((a, b) => {
    return a + b.getCurrentContent().getPlainText();
  }, "");
}

// Add this two column editor to global registry
window.editors.ManyColumnEditor = {
  emptyEditorState: emptyState(),
  newNoteContent: emptySerializedState(),
  screenName: "Many Column Note"
};
