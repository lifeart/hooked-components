import { setComponentManager } from '@ember/component';
import { useEffect, getEffects, getContext, updateContext, extract } from 'hooks-component/component-managers/hooks';

export { useEffect, getEffects, getContext, updateContext };

class HooksComponent<T = object> {
  __isFirstRender: boolean = false
  __effectsRunning: boolean = false
  __effectsState: object | null = null
  __locked: boolean = false
  __lockTimer: any = false
  constructor(public args: T) {

  }
  didInsertElement() {}
  didUpdate() {}
  // TODO: should we have this?
  // didRender() {}
  destroy() {}
  renderFn() {}
  get extract() {
	return extract;
  }
  get useEffect() {
	return useEffect;
  }
  get updateContext() {
	return updateContext.bind(this);
  }
  _renderFn(attrs: any) {
    return this.renderFn.call(this, attrs);
  }
}


setComponentManager('hooks', HooksComponent);


export default HooksComponent;

