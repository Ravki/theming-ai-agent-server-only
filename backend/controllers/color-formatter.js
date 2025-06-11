module.exports = function formatColorMappings(arr1, colorCategory) {
      let colorToneMappings;
      if(colorCategory === "brand") {
        colorToneMappings = {...brandToneMappings};
      }
      else if (colorCategory === "success") {
        colorToneMappings = {...successToneMappings};
      }
      else if (colorCategory === "warning") {
        colorToneMappings = {...warningToneMappings};
      }
      else if (colorCategory === "error") {
        colorToneMappings = {...errorToneMappings}; 
      }
      else if (colorCategory === "info") {
        colorToneMappings = {...infoToneMappings};
      }
      
      let finalMappedArray = [];
       arr1.forEach(colorObj => {
           let hooksList = colorToneMappings[colorObj.label];
         if(hooksList && hooksList.length > 1) {
             hooksList.forEach(hook => {
                   finalMappedArray.push({
                        name: hook,
                        value: colorObj.hex
               });
           })
         }
         else{
           hooksList && finalMappedArray.push({
            name: hooksList[0],
            value: colorObj.hex
        }); 
         }
       });
       return finalMappedArray;
}

const brandToneMappings = {
  '100': ["--slds-g-color-on-accent-1"],
   '95': ["--slds-g-color-accent-light-1"],
   '90': ["--slds-g-color-accent-light-2"],
   '50': ["--slds-g-color-accent-1", "--slds-g-color-accent-container-1", "--slds-g-color-border-accent-1"],
   '40': ["--slds-g-color-accent-2", "--slds-g-color-accent-container-2", "--slds-g-color-border-accent-2", "--slds-s-link-color"],
   '30': ["--slds-g-color-accent-3", "--slds-g-color-accent-container-3", "--slds-g-color-border-accent-3", "--slds-s-link-color-hover", "--slds-s-link-color-focus", "--slds-s-link-color-active"],
   '20': ["--slds-g-color-accent-light-1"],
   '10': ["--slds-g-color-accent-light-2"],
 };

 const successToneMappings = {
   '90': ["--slds-g-color-success-container-1"],
   '40': ["--slds-g-color-success-1", "--slds-g-color-on-success-1", "--slds-g-color-border-success-1"],
 }

 const errorToneMappings = {
  '90': ["--slds-g-color-error-container-1"],
  '80': ["--slds-g-color-error-container-2"],
  '40': ["--slds-g-color-error-1", "--slds-g-color-on-error-1", "--slds-g-color-border-error-1"],
  '30': ["--slds-g-color-on-error-2", "--slds-g-color-border-error-2"],
}

const warningToneMappings = {
  '90': ["--slds-g-color-warning-container-1"],
  '40': ["--slds-g-color-warning-1", "--slds-g-color-on-warning-1"],
}

 const infoToneMappings = {
  '90': ["--slds-g-color-info-container-1"],
  '40': ["--slds-g-color-info-1", "--slds-g-color-on-info-1"],
}