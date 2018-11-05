import { setComponentManager } from '@ember/component';
export { useEffect, getEffects, getContext, updateContext } from 'hooks-component/component-managers/hooks';

export default function hookedComponent(endUserFunction: Function) {
	setComponentManager('hooks', endUserFunction);
	return endUserFunction;
}
