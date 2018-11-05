hooks-component
==============================================================================

Addon used to experiment with `@glimmer/component` style APIs in Ember apps via
existing public APIs.

Installation
------------------------------------------------------------------------------

```
ember install hooks-component
```


This addon provide 2 DIFFERENT API's

* React - Way hooks implementation (always call component function on rerender).
* Ember - way hooks implementstion (call component function on first render only).



Usage in React-Way
------------------------------------------------------------------------------
The `hooks-component` API supports public React HooksAPI


### Builtin hooks
* `useEffect` -> just like in React API
* `useState` -> just like in React API
* `useLayoutEffect` -> just like in React API
--------
* `getService` -> `getService(serviceName)` -> service lookup hook
* `getController` -> `getController(serviceName)` -> controller lookup hook
* `getRoute` -> `getRoute(routeName)` -> route lookup hook
* `getStore` -> store service lookup


### Example

```js
import { reactComponent, useEffect, useState } from "hooks-component";

function ConferenceSpeakersReact() {
	const [ speakers ] = useState(['Tom', 'Yehuda', 'Ed']);
	const [ current, updateCurrent ] = useState(0);

	useEffect(() => {
		console.log('dummy effect');
	});

	const next = () => {
		let nextSpeaker = current + 1;
		updateCurrent(nextSpeaker);
	}

	return {
		currentlySpeaking: speakers[current],
		moreSpeakers: (speakers.length - 1) > current,
		current,
		next, speakers
	}
}

export default reactComponent(ConferenceSpeakersReact);

```

```hbs
{{!-- app/templates/components/conference-speakers-react.hbs --}}

<div>
  <p>Speaking: {{currentlySpeaking}}</p>
  <ul>
    {{#each speakers key="@index" as |speaker|}}
      <li>{{speaker}}</li>
    {{/each}}
  </ul>

  {{#if moreSpeakers}}
    <button onclick={{action next this.current}}>Next</button>
  {{else}}
    <p>All finished!</p>
  {{/if}}
</div>
```

### How to create custom hooks?
* `createHookState` - crete application singletone with provided key and per-component instance default value;
* `getCurrentContext` - get current cumponent context (in rendering time)
* `getHookState` - get hook state by name
* `destroyHookState` - destroy hook state singleton

```js

// utils/custom-hook.js

import { createHookState, getCurrentContext } from  "hooks-component";

const DUMMY_STORE = createHookState('dummy-store', function() {
	return {
		keys: 1
	};
});

export function myCustomHook() {
	let currentComponent = getCurrentContext();
	let state = DUMMY_STORE.getContext(currentComponent);
	return [ state, function(newState) {
		Object.assign(state, newState);
	}
}

```

```js

import { reactComponent } from "hooks-component";
import myCustomHook from "utils/custom-hook";

function ConferenceSpeakersReact() {
	const [ state , patchState ] = myCustomHook();
	const { keys } = state;

	const next = () => {
		patchState({
			keys: keys + 1
		});
	}

	return { keys }
}

export default reactComponent(ConferenceSpeakersReact);

```

------------------------------------------------------------------------------


Usage in Ember-Way
------------------------------------------------------------------------------

The `hooks-component` API supports part of React hooks API, including:

	updateContext - just like setProperties;
	useEffect - do some calculation after dependent keys changed
	extract - just like getWithDefault for component arguments

`useEffect` - inside `component function` context support: function, tracked property paths in array-like style `['foo.length', 'foo', 'foo.firstObject']`;

All effects called during first render, on rerender effects called only if "tracked" property changed.

### Example

```js
// app/components/conference-speakers.js (.ts would also work)
import hookedComponent from "hooks-component";

function ConferenceSpeakers(attrs = {}) {

	const { updateContext, useEffect, extract } = this;

	useEffect(({current, speakers}) => {
		updateContext({
			currentlySpeaking: speakers[current],
			moreSpeakers: (speakers.length - 1) > current
		})
	}, ['current'] );

	const next = (current) => {
		current++;
		updateContext({
			current 
		});
	}

	return extract(attrs, {
		next,
		current: 0,
		speakers: ['Tom', 'Yehuda', 'Ed']
	});
}

export default hookedComponent(ConferenceSpeakers);
```

```hbs
{{!-- app/templates/components/conference-speakers.hbs --}}

<div>
  <p>Speaking: {{currentlySpeaking}}</p>
  <ul>
    {{#each speakers key="@index" as |speaker|}}
      <li>{{speaker}}</li>
    {{/each}}
  </ul>

  {{#if moreSpeakers}}
    <button onclick={{action next this.current}}>Next</button>
  {{else}}
    <p>All finished!</p>
  {{/if}}
</div>
```


### useEffect API
```ts
function shouldRecomputeEffect(oldObject: object, newObject: object): boolean;
type Tracker = string | object | shouldRecomputeEffect;
type cleanupComputedEffect = undefined | Function;
function computeEffect(newContext: any): cleanupComputedEffect;

function useEffect(computeEffect, trakedItems?: Tracker | Tracker[] , useTrackersOnFirstRender?: boolean = false)
```


### How it's working?
Current hookedComponents implementation logic:

* We run `component function` only once, in component creation time.
* `component function` accept named params (`args`) as first argument, and return `context object`.
* `updateContext` method invoke existing effects and then, do `setProperties(currentContext, updatedProps)`.
* if component `args` updated, it invokes `updateContext` method with updated `args`.
* `useEffect` method adds "after `updateContext` and before `setProperties` callbacks with `updatedProps` object as argument"; 
* if `useEffect` call return function, it will be callded before this effect call next time.
* `updateContext` inside `useEffect` don't reinvoke effects, just patching `updatedProps` with new data.

Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd hooks-component`
* `yarn install`

### Linting

* `yarn lint:js`
* `yarn lint:js --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
