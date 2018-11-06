import { setComponentManager } from '@ember/component';
import { getService } from './component-managers/hooks-react';
export { useState, useEffect, useLayoutEffect, getController, getRoute, getOwner, getContextId, getRerender, addBeforeCallTask } from './component-managers/hooks-react';
export { getContext, updateContext, extract } from 'hooks-component/component-managers/hooks';
export { getService };
export function getStore() {
	return getService('store');
}
export default function hookedComponent(endUserFunction: Function) {
	setComponentManager('hooks', endUserFunction);
	return endUserFunction;
}
export function reactComponent(endUserFunction: Function) {
	setComponentManager('hooks-react', endUserFunction);
	return endUserFunction;
}