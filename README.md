hooks-component
==============================================================================

Addon used to experiment with `@glimmer/component` style APIs in Ember apps via
existing public APIs.

Installation
------------------------------------------------------------------------------

```
ember install hooks-component
```


Usage
------------------------------------------------------------------------------

The `hooks-component` API supports part of React hooks API, including:

	updateContext - just like setProperties;
	useEffect - do some calculation after dependent keys changed
	extract - just like getWithDefault for component arguments

`hooks-component` has only one public property - `renderFn`.

`renderFn`  - has only one argument - named component attributes.

`useEffect` - inside `renderFn` context support: function, tracked property paths in array-like style `['foo.length', 'foo', 'foo.firstObject']`;

All effects called during first render, on rerender effects called only if "tracked" property changed.

### Example

Comprehensive example (nearly **exactly** the same as the [the glimmer.js guides](https://glimmerjs.com/guides/components-and-actions)):

```js
// app/components/conference-speakers.js (.ts would also work)
import Component from "hooks-component";

function ConferenceSpeakers(attrs = {}) {

	const { updateContext, useEffect, extract } = this;

	let { current, speakers } =  extract(attrs, {
		current: 0,
		speakers: ['Tom', 'Yehuda', 'Ed']
	});

	useEffect(({current, speakers}) => {
		updateContext({
			currentlySpeaking: speakers[current],
			moreSpeakers: (speakers.length - 1) > current
		})
	}, ['current'] );

	const next = () => {
		current++;
		updateContext({
			current 
		});
	}

	return {
		current, speakers, next
	}
}

export default class ConferenceSpeakersComponent extends Component {
	renderFn = ConferenceSpeakers;
}
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
    <button onclick={{action next}}>Next</button>
  {{else}}
    <p>All finished!</p>
  {{/if}}
</div>
```


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
