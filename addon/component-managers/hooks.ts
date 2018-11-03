import { getOwner, setOwner } from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import { capabilities } from '@ember/component';
import HooksComponent from 'hooks-component';
import { setProperties, getProperties, get } from '@ember/object';
import { schedule, cancel } from  '@ember/runloop';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';

export interface ComponentManagerArgs {
  named: object;
  positional: any[];
}
type CreateComponentResult = HooksComponent<object> & { ___createComponentResult: true };

var contextMap = new WeakMap();
var effectsMap = new WeakMap();
var currentContext: any = null;

export function extract(obj = {}, fallbackItems: any = {}) {
	let result: any = Object.assign({}, obj);
	let keys = Object.keys(fallbackItems);
	keys.forEach((key)=>{
		if (!(key in result) || isBlank(result[key])) {
			result[key] = fallbackItems[key];
		}
	})
	return result;
}

function shouldUseEffect(component: any, trackers: string[], newAttrs: any) {
	if (component.__isFirstRender) {
		return true;
	}
	let currentComponentContext = getContext(component);
	if (trackers.length === 0) {
		return true;
	}
	let should = false;
	trackers.forEach((path: string)=>{
		if (should) {
			return;
		}
		if (get(currentComponentContext, path) !== get(newAttrs, path)) {
			should = true; 
		}
	});
	return should;
}

function runEffects(component: any, currentComponentContext: any, cb: Function) {
	component.__effectsRunning = true;
	component.__effectsState = currentComponentContext;
	getEffects(component).forEach(([effect, trackers]:[Function, any[]])=>{
		if (shouldUseEffect(component, trackers, currentComponentContext)) {
			effect(component.__effectsState);
		}
	});
	component.__effectsRunning = false;
	cb();
}

function mergeKeys(currentContext: any, newProps: any) {
	let keys = Object.keys(currentContext);
	let items = getProperties.apply(null, [currentContext].concat(keys));
	return Object.assign(items, newProps);
}

export function updateContext (this: any, newProps: any) {
	if (this.__locked) {
		return;
	}
	if (this.__effectsRunning === false) {
		let realContext = getContext(this);
		let ctx = mergeKeys(realContext, newProps);
		runEffects(this, ctx, ()=>{
			setProperties(realContext, (this.__effectsState as any));
			this.__effectsState = null;
			this.__locked = true;
			this.__lockTimer = schedule('afterRender', () => {
				this.__locked = false;
			})
		});
	} else {
		Object.assign(this.__effectsState, newProps);
	}
  }

export function getContext(context: any) {
	return contextMap.get(context);
}

export function getEffects(context: any) {
	return effectsMap.get(context);
}
export function useEffect(fn: Function, trackers: string | string[] = []) {
	if (!isArray(trackers)) {
		if (typeof trackers === 'string') {
			trackers = [trackers];
		} else {
			trackers = [];
		}
	}
	effectsMap.get((currentContext as any)).push([fn, trackers]);
}

export default class HooksComponentManager {
  static create(attrs: any) {
    let owner = getOwner(attrs);
    return new this(owner);
  }
  capabilities: any;
  constructor(owner: ApplicationInstance) {
	setOwner(this, owner);
    this.capabilities = capabilities('3.4', {
      destructor: true,
      asyncLifecycleCallbacks: true,
    });
  }

  createComponent(Klass: typeof HooksComponent, args: ComponentManagerArgs): CreateComponentResult {
	let instance = new Klass(args.named);
	setOwner(instance, getOwner(this));
	currentContext = instance;
	effectsMap.set(instance, []);
	instance.__isFirstRender = true;
	let ctx = instance._renderFn.call(instance, args.named);
	contextMap.set(instance, ctx);
	updateContext.call(instance, {});
	instance.__isFirstRender = false;
	currentContext = null;
    return instance as CreateComponentResult;
  }

  updateComponent(component: CreateComponentResult, args: ComponentManagerArgs) {
	updateContext.call(component, args.named)
  }

  destroyComponent(component: CreateComponentResult) {
	component.destroy();
	cancel(component.__lockTimer);
	contextMap.delete(component);
	effectsMap.delete(component);
  }

  getContext(component: CreateComponentResult) {
    return contextMap.get(component);
  }

  didCreateComponent(component: CreateComponentResult) {
    component.didInsertElement();
  }

  didUpdateComponent() {

  }
}
