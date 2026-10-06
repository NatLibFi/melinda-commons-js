interface basicNotificationContext {
  text: string
}

interface basicNotificationResult {
  text: string
}

export function generateBasicNotification(basicContext: basicNotificationContext): basicNotificationResult {
  return {text: basicContext.text};
}

interface blobNotificationContext {
  profile?: string,
  id?: string,
  correlationId?: string,
  numberOfRecords?: number,
  failedRecords?: number,
  processedRecords?: number,
  created?: number,
  updated?: number,
  skipped?: number,
  error?: number
}

// Same as in utils
interface sendNotificationOpts {
  environment?: false | string,
  linkUrl?: string,
  template: string | false,
  fail?: boolean
}

interface blobNotificationResult {
  blocks: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
}

// eslint-disable-next-line max-lines-per-function -- Slack block builder helpers are deliberately scoped to this function
export function generateBlobNotification({
  profile = '',
  id = '',
  correlationId = '',
  numberOfRecords = 0,
  failedRecords = 0,
  processedRecords = 0,
  created = 0,
  updated = 0,
  skipped = 0,
  error = 0
}: blobNotificationContext, {environment = false, linkUrl = ''}: sendNotificationOpts): blobNotificationResult {
  function plainText(text: string) {
    return {
      'type': 'text',
      'text': text
    };
  }

  function boldText(text: string) {
    return {
      'type': 'text',
      'text': text,
      'style': {
        'bold': true
      }
    };
  }

  function linkElement(text: string, url: string) {
    return {
      'type': 'link',
      'url': url,
      'text': text
    };
  }

  function richTextSection(elements: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      'type': 'rich_text_section',
      'elements': elements
    };
  }

  function richTextBlock(elements: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      'type': 'rich_text',
      'elements': elements
    };
  }

  function bulletListBlock(sections: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return richTextBlock([{
      'type': 'rich_text_list',
      'style': 'bullet',
      'indent': 1,
      'elements': sections
    }]);
  }

  function labelValueSection(label: string, value: string) {
    return richTextSection([plainText(label), plainText(value)]);
  }

  function headingSection(heading: string) {
    return richTextBlock([richTextSection([boldText(heading)])]);
  }

  const headerText = `${environment ? `${environment} - ` : ''}Record import blob: ${profile}`;

  return {
    'blocks': [
      {
        'type': 'header',
        'text': {
          'type': 'plain_text',
          'text': headerText,
          'emoji': true
        }
      },
      {
        'type': 'divider'
      },
      richTextBlock([
        richTextSection([boldText('Id: '), plainText(`${id}`)]),
        richTextSection([
          boldText('Correlation id: '),
          linkElement(`${correlationId}`, `${linkUrl}/?id=${correlationId}`)
        ])
      ]),
      headingSection('Transformation results'),
      bulletListBlock([
        labelValueSection('Number of records: ', `${numberOfRecords}`),
        labelValueSection('Failed records: ', `${failedRecords}`),
        labelValueSection('Processed records: ', `${processedRecords}`)
      ]),
      headingSection('Process results'),
      bulletListBlock([
        labelValueSection('Created records: ', `${created}`),
        labelValueSection('Updated records: ', `${updated}`),
        labelValueSection('Skipped records: ', `${skipped}`),
        labelValueSection('Error records: ', `${error}`)
      ]),
      {
        'type': 'divider'
      }
    ]
  };
}
