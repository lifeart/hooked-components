import Component from "hooks-component";

function ConferenceSpeakers(attrs = {}) {

	const { updateContext, useEffect, extract } = this;

	let { current, speakers } =  extract(attrs, {
		current: 0,
		speakers: ['Tom', 'Yehuda', 'Ed']
	});

	useEffect(({current, speakers}) => {
		updateContext({
			date: new Date(),
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