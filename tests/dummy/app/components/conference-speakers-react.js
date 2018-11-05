import { reactComponent, useEffect, useState, useLayoutEffect } from "hooks-component";

	function ConferenceSpeakersReact() {
		const [ speakers ] = useState(['Tom', 'Yehuda', 'Ed']);
		let [ current, updateCurrent ] = useState(0);

		useEffect(() => {
			//console.log('dummy effect');
		});

		useLayoutEffect(()=>{
			// console.log('comeponent rendered');
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