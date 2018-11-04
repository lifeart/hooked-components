import Component from "hooks-component";

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

export default class ConferenceSpeakersComponent extends Component {
	renderFn = ConferenceSpeakers;
}