import { reactComponent, useEffect, useState } from "hooks-component";

function ConferenceSpeakersReact(args) {
	const [ speakers ] = useState(['Tom', 'Yehuda', 'Ed']);
	let [ current, updateCurrent ] = useState(0);
	if (args.current) {
		current = args.current;
	}
	// currentlySpeaking
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