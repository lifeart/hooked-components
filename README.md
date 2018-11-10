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
* Ember - way hooks implementation (call component function on first render only).



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
* `getOwner` -> `getOwner()` -> equals `getOwner(this)` in Ember.

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

* `getContextId` -> `getContextId()` -> get current instance context id (same between rerenders)
* `getRerender` -> return binded to current instance `update` function
* `addBeforeCallTask` -> execute some callback before component `update`
* `addBeforeDestroyTask` -> execute some callback before any component `destroy`

```js

// utils/custom-hook.js

import { getContextId, getRerender, addBeforeCallTask, addBeforeDestroyTask } from  "hooks-component";

const DUMMY_STORE = {};
var CALL_COUNTER = 0;

addBeforeCallTask(()=>{
	CALL_COUNTER = 0;
});

addBeforeDestroyTask(()=>{
	const uid = getContextId();
	if (uid in DUMMY_STORE) {
		delete DUMMY_STORE[uid];
	}
});

export function myCustomHook(componentStoreDefaultValue = {}) {
	const uid = getContextId(); // current component instance ID
	const hookCallId = CALL_COUNTER; // how many times hook called during rendering
	if (!(uid in DUMMY_STORE)) {
		DUMMY_STORE[uid] =  {}; // init store for component instance;
	}
	if (!(hookCallId in DUMMY_STORE[uid])) {
		// init store for exact call number inside component isntance;
		DUMMY_STORE[uid][hookCallId] = componentStoreDefaultValue;
	}
	// get current instance + callNumber state
	let state = DUMMY_STORE[uid][hookCallId];
	// get rerender function (must be inside hook)
	let rerender = getRerender();
	// increment hook call counter
	CALL_COUNTER++;
	// return current state for exact component and callNumber and update state function
	return [ state, function(newState) {
		Object.assign(state, newState);
		// rerender will invoke component rerender
		rerender();
	}
}

```

```js

import { reactComponent } from "hooks-component";
import myCustomHook from "utils/custom-hook";

function ConferenceSpeakersReact() {
	const [ state , patchState ] = myCustomHook({ keys: 1 });
	const [ fish, patchFish ] = myCustomHook({ salmon: 1 });
	const { keys } = state;
	const { salmon } = fish;

	const next = () => {
		patchState({
			keys: keys + 1
		})
	}

	const addSalmon = () => {
		patchFish({
			salmon: salmon + 1
		})
	}

	return { keys, next, salmon }
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
