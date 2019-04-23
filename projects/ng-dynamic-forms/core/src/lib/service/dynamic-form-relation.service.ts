import { Inject, Injectable, Injector, Optional } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { DynamicFormControlModel } from "../model/dynamic-form-control.model";
import { DYNAMIC_MATCHERS, DynamicFormControlMatcher } from "./dynamic-form-relation.matchers";
import {
    AND_OPERATOR,
    DynamicFormControlCondition,
    DynamicFormControlRelation,
    OR_OPERATOR
} from "../model/misc/dynamic-form-control-relation.model";

@Injectable({
    providedIn: "root"
})
export class DynamicFormRelationService {

    constructor(@Optional() @Inject(DYNAMIC_MATCHERS) private DYNAMIC_MATCHERS: DynamicFormControlMatcher[], private injector: Injector) {}

    getRelatedFormControls(model: DynamicFormControlModel, group: FormGroup): FormControl[] {

        const controls: FormControl[] = [];

        model.relation.forEach(relation => relation.when.forEach(condition => {

            if (model.id === condition.id) {
                throw new Error(`FormControl ${model.id} cannot depend on itself`);
            }

            const control = group.get(condition.id) as FormControl;

            if (control && !controls.some(controlElement => controlElement === control)) {
                controls.push(control);
            }
        }));

        return controls;
    }

    findRelation(relations: DynamicFormControlRelation[], states: string[]): DynamicFormControlRelation | null {

        const relation = relations.find(relation => {
            return states.some(state => state === relation.state);
        });

        return relation || null;
    }

    matchesCondition(relation: DynamicFormControlRelation, group: FormGroup, matcher: DynamicFormControlMatcher): boolean {

        const operator = relation.operator || OR_OPERATOR;

        return relation.when.reduce((hasMatched: boolean, condition: DynamicFormControlCondition, index: number) => {

            const relatedControl = group.get(condition.id);

            if (relatedControl && relation.state === matcher.matchState) {

                if (index > 0 && operator === AND_OPERATOR && !hasMatched) {
                    return false;
                }

                if (index > 0 && operator === OR_OPERATOR && hasMatched) {
                    return true;
                }

                return condition.value === relatedControl.value || condition.status === relatedControl.status;
            }

            if (relatedControl && relation.state === matcher.opposingState) {

                if (index > 0 && operator === AND_OPERATOR && hasMatched) {
                    return true;
                }

                if (index > 0 && operator === OR_OPERATOR && !hasMatched) {
                    return false;
                }

                return !(condition.value === relatedControl.value || condition.status === relatedControl.status);
            }

            return false;

        }, false);
    }

    updateByRelations(model: DynamicFormControlModel, control: FormControl, group: FormGroup): void {

        if (Array.isArray(this.DYNAMIC_MATCHERS)) {

            this.DYNAMIC_MATCHERS.forEach(matcher => {

                const relation = this.findRelation(model.relation, [matcher.matchState, matcher.opposingState]);

                if (relation) {

                    const hasMatch = this.matchesCondition(relation, group, matcher);
                    matcher.onMatch(hasMatch, model, control, this.injector);
                }
            });
        }
    }
}
