import { setComponentManager } from '@ember/component';
export { useState, useEffect } from './component-managers/hooks-react';
export { getContext, updateContext, extract } from 'hooks-component/component-managers/hooks';
export default function hookedComponent(endUserFunction: Function) {
	setComponentManager('hooks', endUserFunction);
	return endUserFunction;
}
export function reactComponent(endUserFunction: Function) {
	setComponentManager('hooks-react', endUserFunction);
	return endUserFunction;
}