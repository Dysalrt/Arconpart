const PREFIX="arcon:";
export const storage={
 get(key){const v=localStorage.getItem(PREFIX+key);try{return v===null?null:JSON.parse(v)}catch{return v}},
 set(key,value){localStorage.setItem(PREFIX+key,JSON.stringify(value))}
};