export function generateAuthorizationHeader(username, password = '') {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

export function isDeletedRecord(record) {
  if (['d', 's', 'x'].includes(record.leader[5])) {
    return true;
  }

  return checkDel() || checkSta();

  function checkDel() {
    return record.get(/^DEL$/u).some(check);

    function check({subfields}) {
      return subfields.some(({code, value}) => code === 'a' && value === 'Y');
    }
  }

  function checkSta() {
    return record.get(/^STA$/u).some(check);

    function check({subfields}) {
      const values = ['DELETED', 'DELETED-SPLIT', 'DELETED-DEPRECATED'];
      return subfields.some(({code, value}) => code === 'a' && values.includes(value));
    }
  }
}

export function isComponentRecord(record, ignoreCollections = false, additionalHostFields = []) {

  // Record is a component record if it has bibliografic level of a component in leader
  // and/or has at least one host link field (f773)


  // Ignore collections - optionally do not handle collections (LDR/07 'c')
  // or collection subUnits (LDR/07 'd') as components, even if they do have f773

  // https://www.loc.gov/marc/bibliographic/bdleader.html
  // LDR/07
  //  c - Collection
  // d - Subunit (in a collection)

  if (ignoreCollections && ['c', 'd'].includes(record.leader[7])) {
    return false;
  }

  // https://www.loc.gov/marc/bibliographic/bdleader.html
  // LDR/07
  // a - Monographic component part
  // b - Serial component part
  // d - Subunit (in a collection)

  if (['a', 'b', 'd'].includes(record.leader[7])) {
    return true;
  }

  // https://www.loc.gov/marc/bibliographic/bd773.html
  // 773 - Host Item Entry (R)

  // additionalHostFields (for example f973 for Viola's multihost componenets)
  // optionally recognize fields given in additionalHostFields array as hostFields

  const hostFields = additionalHostFields.concat('773');
  const hostFieldPatternString = `^(${hostFields.join('|')})$`;
  const hostFieldRegex = new RegExp(hostFieldPatternString, 'u');

  const recordHasHostFields = record.get(hostFieldRegex).length > 0;
  return recordHasHostFields;
  //return record.get(/^773$/u).length > 0;
}

export function parseBoolean(value) {
  if (value === undefined) {
    return false;
  }

  if (Number.isNaN(Number(value))) {
    return value.length > 0 && !(/^(?:false)$/ui).test(value);
  }

  return Boolean(Number(value));
}

export function getRecordTitle(record) {
  const TRIM_PATTERN = '[?!.,(){}:;/ ]*';
  // DEVELOP: get mainHeadings for aut records
  const field = record
    .get(/^245$/u)
    .find(f => f.subfields.some(sf => sf.code === 'a'));

  if (field) {
    return field.subfields.find(sf => sf.code === 'a').value
      .replace(new RegExp(`^${TRIM_PATTERN}`, 'u'), '')
      .replace(new RegExp(`${TRIM_PATTERN}$`, 'u'), '');
  }

  return '';
}

export function getRecordStandardIdentifiers(record) {
  return record.get(/^(?<def>020|022|024)$/u)
    .filter(f => f.subfields.some(sf => ['a', 'z'].includes(sf.code)))
    .map(field => {
      const subfield = field.subfields.find(sf => ['a', 'z'].includes(sf.code));
      return subfield.value;
    });
}

export function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

export function toAlephId(id) {
  return id.padStart(9, '0');
}

export function fromAlephId(id) {
  return id.replace(/^0+/u, '');
}
