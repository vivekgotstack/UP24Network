export type WorkflowPolicy = {
  accountId:string;requireDateline:boolean;requireSources:boolean;requireMedia:boolean;
  autofill:boolean;defaultCategory:string;defaultCity:string;version:number;
};
export const defaultWorkflow:WorkflowPolicy={accountId:'',requireDateline:true,requireSources:true,requireMedia:true,
  autofill:true,defaultCategory:'Uttar Pradesh',defaultCity:'',version:0};
